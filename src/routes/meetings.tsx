import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/app-shell";
import { SelectInput, TextArea, TextInput } from "@/components/forms";
import { Empty, Panel, PanelHead, formatDate } from "@/components/kit";
import { useOrgData, useStore } from "@/lib/store";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Archivist" },
      { name: "description", content: "Schedule meetings, record who attended and keep the notes with the project." },
      { property: "og:title", content: "Meetings — Archivist" },
      { property: "og:description", content: "Schedule meetings, record who attended and keep the notes with the project." },
    ],
  }),
  component: Meetings,
});

const today = () => new Date().toISOString().slice(0, 10);

function Meetings() {
  const { org, orgId, addMeeting, updateMeeting, removeMeeting } = useStore();
  const { meetings, projects, members } = useOrgData();
  const [form, setForm] = useState({ title: "", date: today(), time: "10:00", projectId: "", notes: "" });

  const sorted = [...meetings].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const now = today();
  const upcoming = sorted.filter((m) => m.date >= now).reverse();
  const past = sorted.filter((m) => m.date < now);

  const toggleAttendee = (id: string, memberId: string, current: string[]) =>
    updateMeeting(id, {
      attendeeIds: current.includes(memberId) ? current.filter((x) => x !== memberId) : [...current, memberId],
    });

  const renderMeeting = (m: (typeof meetings)[number]) => (
    <div key={m.id} className="border-b border-line/50 px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-24 shrink-0 font-mono text-[10.5px] text-ink-soft">
          <div className="text-ink">{formatDate(m.date)}</div>
          <div>{m.time}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              value={m.title}
              onChange={(e) => updateMeeting(m.id, { title: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none focus:text-accent"
            />
            <span className="font-mono text-[9.5px] text-ink-soft">
              {projects.find((p) => p.id === m.projectId)?.name ?? "No project"}
            </span>
            <button onClick={() => removeMeeting(m.id)} className="font-mono text-[10.5px] text-ink-soft hover:text-rose">
              ✕
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {members.map((mem) => {
              const on = m.attendeeIds.includes(mem.id);
              return (
                <button
                  key={mem.id}
                  onClick={() => toggleAttendee(m.id, mem.id, m.attendeeIds)}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] transition-colors ${
                    on ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-ink-soft hover:border-ink/30"
                  }`}
                >
                  {mem.name}
                </button>
              );
            })}
          </div>
          <TextArea
            value={m.notes}
            onChange={(e) => updateMeeting(m.id, { notes: e.target.value })}
            placeholder="Notes, agenda, outcomes…"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Meetings" crumb={`${org?.name ?? ""} · ${meetings.length} recorded`} />

      <div className="px-6 py-7 md:px-8">
        <Panel>
          <PanelHead index="a" title="Schedule a meeting" />
          <div className="grid gap-2 px-4 md:grid-cols-4">
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <TextInput type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            <SelectInput value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="px-4 pt-2">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Agenda" />
          </div>
          <div className="px-4 py-3">
            <PrimaryButton
              onClick={() => {
                if (!form.title.trim()) {
                  toast.error("Give the meeting a title");
                  return;
                }
                addMeeting({
                  orgId,
                  projectId: form.projectId || null,
                  title: form.title.trim(),
                  date: form.date,
                  time: form.time,
                  attendeeIds: [],
                  notes: form.notes,
                });
                setForm({ title: "", date: today(), time: "10:00", projectId: "", notes: "" });
                toast.success("Meeting scheduled");
              }}
            >
              Schedule
            </PrimaryButton>
          </div>
        </Panel>

        <div className="mt-3 grid gap-3">
          <Panel>
            <PanelHead index="b" title="Upcoming" />
            {upcoming.length === 0 ? (
              <div className="p-4">
                <Empty text="Nothing scheduled" />
              </div>
            ) : (
              upcoming.map(renderMeeting)
            )}
          </Panel>

          <Panel>
            <PanelHead index="c" title="Past meetings" />
            {past.length === 0 ? (
              <div className="p-4">
                <Empty text="No past meetings" />
              </div>
            ) : (
              past.map(renderMeeting)
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
