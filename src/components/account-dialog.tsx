import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, TextInput } from "@/components/forms";
import { useAuth } from "@/lib/auth";

/** Self-service account settings: change your own password, or sign out every device. */
export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, changePassword, logoutEverywhere } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setCurrentPassword("");
    setNewPassword("");
    onClose();
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed. Other devices were signed out.");
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  async function signOutEverywhere() {
    setBusy(true);
    try {
      await logoutEverywhere();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out");
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={`Account · ${user?.username ?? ""}`} onClose={close}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Current password">
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="New password">
          <TextInput
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <p className="text-[11px] text-ink-soft">12+ characters with uppercase, lowercase, number and special character.</p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <GhostButton type="button" onClick={() => void signOutEverywhere()} disabled={busy}>
            Sign out everywhere
          </GhostButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
