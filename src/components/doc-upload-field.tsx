import { FileUp, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { apiUpload } from "@/lib/api-client";
import type { ID } from "@/lib/types";

export interface UploadedFileInfo {
  fileId: ID;
  fileName: string;
  fileSize: number;
  fileMime: string;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A file picker that uploads immediately on selection and reports back the stored file's metadata. */
export function DocUploadField({
  orgId,
  projectId,
  value,
  onChange,
}: {
  orgId: ID;
  projectId: ID | null;
  value: UploadedFileInfo | null;
  onChange: (file: UploadedFileInfo | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File is too large (25MB max)");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("orgId", orgId);
      if (projectId) form.set("projectId", projectId);
      const uploaded = await apiUpload<{ id: ID; fileName: string; mimeType: string; size: number }>("/api/files", form);
      onChange({ fileId: uploaded.id, fileName: uploaded.fileName, fileSize: uploaded.size, fileMime: uploaded.mimeType });
      toast.success("File uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-[13px]">
        <FileUp size={14} className="shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1 truncate">{value.fileName}</span>
        <span className="shrink-0 text-[10px] text-ink-soft">{formatBytes(value.fileSize)}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="Remove uploaded file" className="shrink-0 text-ink-soft hover:text-rose">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-ink-soft transition-colors hover:border-accent/50 hover:text-ink ${
        uploading ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {uploading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
      {uploading ? "Uploading…" : "Upload a file (PDF, Word, Excel, image…)"}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.png,.jpg,.jpeg,.gif,.webp,.zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
    </label>
  );
}
