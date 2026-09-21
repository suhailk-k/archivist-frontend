import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Field, TextInput } from "@/components/forms";
import { PrimaryButton } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api-client";

export const Route = createFileRoute("/setup")({ component: SetupPage });

function SetupPage() {
  const navigate = useNavigate();
  const { setup } = useAuth();
  const [username, setUsername] = useState("admin");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await setup(username, displayName, password);
      await navigate({ to: "/" });
    } catch (reason) {
      setError(reason instanceof ApiRequestError ? reason.message : "Could not connect to Archivist backend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-ink">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-xl">
        <div className="mb-6">
          <div className="font-display text-2xl font-medium">First-time setup</div>
          <p className="mt-1 text-sm text-ink-soft">Create your superadmin account.</p>
        </div>
        <div className="space-y-4">
          <Field label="User ID">
            <TextInput value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          </Field>
          <Field label="Your name">
            <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required />
          </Field>
          <Field label="Password">
            <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </Field>
          <p className="text-[11px] text-ink-soft">Use 12+ characters with uppercase, lowercase, number, and special character.</p>
          {error ? <p role="alert" className="rounded-lg border border-rose/30 bg-rose/10 p-3 text-xs text-rose">{error}</p> : null}
          <PrimaryButton type="submit" disabled={busy}>{busy ? "Creating…" : "Create superadmin"}</PrimaryButton>
        </div>
      </form>
    </main>
  );
}
