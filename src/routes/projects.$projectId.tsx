import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  ExternalLink,
  Flag,
  FolderOpen,
  Github,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  type LucideIcon,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton, useHeaderActions } from "@/components/app-shell";
import { CredentialsPanel } from "@/components/credentials-panel";
import { ConfirmModal, Field, Modal, SelectInput, TextArea, TextInput } from "@/components/forms";
import { ProjectLinksEditor } from "@/components/project-links-editor";
import { DateChip, Empty, Pill, Timeline, formatDate, relativeTime } from "@/components/kit";
import { ProjectDocs } from "@/components/project-docs";
import { EMPTY_PROJECT_LINK, validateProjectLinks, type ProjectLinkDraft } from "@/lib/project-links";
import { projectProgress, useStore } from "@/lib/store";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
  type Member,
  type Priority,
  type Project,
  type ProjectStatus,
} from "@/lib/types";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project — Archivist" },
      { name: "description", content: "Project overview, plan, documents, meetings, decisions, team and full history." },
      { property: "og:title", content: "Project — Archivist" },
      { property: "og:description", content: "Project overview, plan, documents, meetings, decisions, team and full history." },
    ],
  }),
  component: ProjectDetail,
});

const TABS = ["Overview", "Planning", "Documents", "Meetings", "Decisions", "Credentials", "Team", "History"] as const;
type Tab = (typeof TABS)[number];

const STATUSES: ProjectStatus[] = ["planning", "in_progress", "review", "blocked", "done"];

const AVATAR_COLORS = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500"];

// Phases that haven't been picked up yet read as "not started"; anything else (and not done) counts as in-progress.
const NOT_STARTED_PHASES = new Set(["", "to do", "todo", "backlog", "unsorted"]);

function ProjectDetail() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const store = useStore();
  const { db } = store;
  const [tab, setTab] = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({ name: "", role: "", email: "" });

  const project = db.projects.find((p) => p.id === projectId);

  useHeaderActions(
    project ? (
      <ProjectActionsMenu
        trigger={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-[12.5px] font-semibold text-paper shadow-sm hover:opacity-90"
          >
            <UsersRound size={15} />
            Manage
            <ChevronDown size={14} />
          </button>
        }
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
    ) : null,
  );

  if (!project) {
    return (
      <div className="px-8 py-7">
        <Empty text="This project no longer exists" />
        <div className="mt-3">
          <Link to="/projects" className="text-[11px] text-accent hover:underline">
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const members = db.members.filter((m) => m.orgId === project.orgId);
  const assignedMembers = members.filter((m) => project.memberIds.includes(m.id));
  const tasks = db.tasks.filter((t) => t.projectId === project.id);
  const milestones = db.milestones.filter((m) => m.projectId === project.id).sort((a, b) => a.date.localeCompare(b.date));
  const meetings = db.meetings.filter((m) => m.projectId === project.id).sort((a, b) => a.date.localeCompare(b.date));
  const decisions = db.decisions.filter((d) => d.projectId === project.id);
  const history = db.activity.filter((a) => a.projectId === project.id);
  const owner = members.find((m) => m.id === project.ownerId);
  const progress = projectProgress(db.tasks, project.id);

  const openTasks = tasks.filter((task) => !task.done);
  const completedTasks = tasks.filter((task) => task.done).length;
  const inProgressTasks = openTasks.filter((task) => !NOT_STARTED_PHASES.has((task.phase || "").trim().toLowerCase()));
  const recentActivity = history.slice(0, 5);

  return (
    <>
      <div className="min-h-full bg-[#f7f9fc] px-5 py-5 md:px-8 md:py-6">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_280px] md:p-7">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <Pill tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status].toUpperCase()}</Pill>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  Updated {formatDate(project.createdAt.slice(0, 10))}
                  <ChevronDown size={13} className="text-slate-400" />
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{project.name}</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-600">{project.description || "No description yet."}</p>
              <div className="mt-6 flex max-w-xl items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-700">{progress}%</span>
              </div>
            </div>
            <div className="relative -mx-6 -mb-6 space-y-4 border-t border-slate-200 bg-gradient-to-br from-indigo-50/80 via-sky-50/80 to-violet-100/80 px-6 py-6 text-sm text-slate-700 md:-my-7 md:ml-0 md:-mr-7 md:border-l md:border-t-0 md:py-7 md:pl-6 md:pr-7">
              <div className="flex items-start gap-3">
                <UserRound size={18} className="mt-0.5 text-slate-500" />
                <div>
                  <div className="text-[11px] text-slate-500">Owner</div>
                  <div className="font-medium">{owner?.name ?? "Unassigned"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UsersRound size={18} className="mt-0.5 text-slate-500" />
                <div>
                  <div className="text-[11px] text-slate-500">Team</div>
                  {assignedMembers.length === 0 ? (
                    <div className="font-medium">0 people</div>
                  ) : (
                    <div className="mt-1 flex items-center -space-x-2">
                      {assignedMembers.slice(0, 3).map((member, index) => (
                        <div
                          key={member.id}
                          title={member.name}
                          className={`grid size-7 place-items-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                        >
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                      ))}
                      {assignedMembers.length > 3 ? (
                        <div className="grid size-7 place-items-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-600">
                          +{assignedMembers.length - 3}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays size={18} className="mt-0.5 text-slate-500" />
                <div>
                  <div className="text-[11px] text-slate-500">Timeline</div>
                  <div className="font-medium">
                    {project.startDate ? formatDate(project.startDate) : "—"} – {project.dueDate ? formatDate(project.dueDate) : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex gap-1 overflow-x-auto border-t border-slate-200 px-4 pt-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`relative shrink-0 px-3 py-3 text-[12px] font-medium transition-colors ${
                  tab === t ? "text-indigo-700" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t}
                {tab === t ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-600" /> : null}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <ProjectStat icon={ListChecks} label="Open Tasks" value={openTasks.length} tone="indigo" onClick={() => setTab("Planning")} />
          <ProjectStat icon={Clock3} label="In Progress" value={inProgressTasks.length} tone="amber" onClick={() => setTab("Planning")} />
          <ProjectStat icon={CircleCheck} label="Completed" value={completedTasks} tone="emerald" onClick={() => setTab("Planning")} />
          <ProjectStat icon={UsersRound} label="Team Members" value={assignedMembers.length} tone="violet" onClick={() => setTab("Team")} />
        </div>

        {tab === "Overview" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_640px]">
            <div className="space-y-4">
              <ProjectCard
                title="Open Tasks"
                icon={ListChecks}
                action={
                  <button type="button" onClick={() => setTab("Planning")} className="flex items-center text-xs font-medium text-indigo-600 hover:underline">
                    View all <ChevronRight size={14} />
                  </button>
                }
              >
                {openTasks.length === 0
                  ? <Empty text="Nothing open" />
                  : openTasks.slice(0, 6).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3">
                        <span className="grid size-5 place-items-center rounded border border-slate-300" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">{task.title}</span>
                        <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-600">{task.phase || "To Do"}</span>
                        <span className="hidden text-[11px] text-slate-500 sm:block">
                          {db.members.find((m) => m.id === task.assigneeId)?.name ?? "Unassigned"}
                        </span>
                        <span className="hidden text-[11px] text-slate-500 sm:block">{task.dueDate || "No due date"}</span>
                      </div>
                    ))}
              </ProjectCard>
              <ProjectCard
                title="Milestones"
                icon={Flag}
                action={
                  <button type="button" onClick={() => setTab("Planning")} className="flex items-center text-xs font-medium text-indigo-600 hover:underline">
                    <Plus size={14} className="mr-1" />
                    Add milestone
                  </button>
                }
              >
                {milestones.length === 0
                  ? <Empty text="No milestones set yet" />
                  : milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3">
                        <span
                          className={`grid size-6 place-items-center rounded-full ${
                            milestone.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {milestone.done ? <Check size={14} /> : <Flag size={13} />}
                        </span>
                        <span className="flex-1 text-[13px] font-medium text-slate-800">{milestone.title}</span>
                        <span className="text-[11px] text-slate-500">{formatDate(milestone.date)}</span>
                      </div>
                    ))}
              </ProjectCard>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <ProjectCard title="Quick Links" icon={FolderOpen} action={<GhostButton onClick={() => setLinksOpen(true)}>Edit</GhostButton>}>
                  {project.links.length === 0
                    ? <Empty text="No links added" />
                    : project.links.map((link) => {
                        const Icon = link.url.includes("github.com") ? Github : LayoutDashboard;
                        return (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 py-2 text-[12.5px] text-slate-700 hover:text-indigo-600"
                          >
                            <span className="grid size-8 place-items-center rounded-full bg-slate-50 text-slate-600">
                              <Icon size={15} />
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">{link.label}</span>
                            <ExternalLink size={14} className="text-slate-400" />
                          </a>
                        );
                      })}
                </ProjectCard>
              </div>

              <div className="space-y-4">
                <ProjectCard
                  title="Recent Activity"
                  icon={Sparkles}
                  action={
                    <button type="button" onClick={() => setTab("History")} className="flex items-center text-xs font-medium text-indigo-600 hover:underline">
                      View all <ChevronRight size={14} />
                    </button>
                  }
                >
                  {recentActivity.length === 0 ? (
                    <Empty text="Nothing recorded yet" />
                  ) : (
                    <Timeline items={recentActivity.map((activity) => ({ id: activity.id, text: activity.text, meta: relativeTime(activity.at), tone: activity.tone }))} />
                  )}
                </ProjectCard>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "Planning" ? (
          <div className="mt-4">
            <PlanningTab projectId={project.id} />
          </div>
        ) : null}

        {tab === "Documents" ? (
          <div className="mt-4">
            <ProjectDocs projectId={project.id} orgId={project.orgId} />
          </div>
        ) : null}

        {tab === "Meetings" ? (
          <div className="mt-4 space-y-2.5">
            {meetings.length === 0 ? <Empty text="No meetings for this project" /> : null}
            {meetings.map((meeting) => (
              <div key={meeting.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <DateChip date={meeting.date} />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium">{meeting.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {meeting.time} · {meeting.attendeeIds.length} attending
                  </div>
                  {meeting.notes ? <p className="mt-1.5 text-[12.5px] text-slate-500">{meeting.notes}</p> : null}
                </div>
              </div>
            ))}
            <Link to="/meetings" className="inline-block text-xs font-medium text-indigo-600 hover:underline">
              Schedule a meeting →
            </Link>
          </div>
        ) : null}

        {tab === "Decisions" ? (
          <div className="mt-4">
            <DecisionsTab decisions={decisions} members={members} />
          </div>
        ) : null}

        {tab === "Credentials" ? (
          <div className="mt-4">
            <CredentialsPanel orgId={project.orgId} projectId={project.id} />
          </div>
        ) : null}

        {tab === "Team" ? (
          <div className="mt-4">
            <TeamTab
              assignedMembers={assignedMembers}
              members={members}
              project={project}
              onAddMember={() => {
                setSelectedMemberIds([]);
                setAddMemberOpen(true);
              }}
              onRemoveMember={(memberId) => {
                const removed = members.find((m) => m.id === memberId);
                store.updateProject(project.id, { memberIds: project.memberIds.filter((id) => id !== memberId) });
                if (removed) toast.success(`${removed.name} removed from project`);
              }}
            />
          </div>
        ) : null}

        {tab === "History" ? (
          <div className="mt-4">
            <Timeline items={history.map((activity) => ({ id: activity.id, text: activity.text, meta: relativeTime(activity.at), tone: activity.tone }))} />
          </div>
        ) : null}

        {tab === "Overview" ? (
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-amber-100 text-amber-600">
                <Lightbulb size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Ready to make progress?</div>
                <div className="text-xs text-slate-500">Add more tasks, set milestones and keep your team aligned.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab("Planning")}
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus size={15} className="mr-1.5" />
                Create Task
              </button>
              <button
                type="button"
                onClick={() => setTab("Planning")}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <CalendarDays size={15} className="mr-1.5" />
                Plan Timeline
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <EditProjectModal open={editOpen} onClose={() => setEditOpen(false)} projectId={project.id} />
      <EditLinksModal open={linksOpen} onClose={() => setLinksOpen(false)} projectId={project.id} />
      <ConfirmModal
        open={deleteOpen}
        title="Delete project?"
        description={`This permanently deletes "${project.name}" and all its tasks, documents, meetings and decisions. This can't be undone.`}
        confirmLabel="Delete project"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          store.removeProject(project.id);
          toast.success("Project deleted");
        }}
      />
      <Modal
        open={addMemberOpen}
        title="Add members to project"
        onClose={() => {
          setSelectedMemberIds([]);
          setAddMemberOpen(false);
        }}
      >
        <div className="space-y-3">
          <Field label={`Organisation members · ${selectedMemberIds.length} selected`}>
            <div
              className="max-h-64 space-y-2 overflow-y-auto pr-1"
              role="listbox"
              aria-label="Organisation members available for this project"
              aria-multiselectable="true"
            >
              {members
                .filter((member) => !project.memberIds.includes(member.id))
                .map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() =>
                        setSelectedMemberIds((current) =>
                          isSelected ? current.filter((id) => id !== member.id) : [...current, member.id],
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent/70 ${
                        isSelected
                          ? "border-accent bg-accent/10 ring-1 ring-accent/50"
                          : "border-line bg-paper/40 hover:border-accent/60 hover:bg-panel/70"
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                          isSelected ? "bg-accent text-paper" : "bg-accent-soft text-accent"
                        }`}
                      >
                        {isSelected ? "✓" : member.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">{member.name}</span>
                        <span className="block truncate font-mono text-[10px] text-ink-soft">{member.role || "No role set"}</span>
                      </span>
                    </button>
                  );
                })}
              {members.every((member) => project.memberIds.includes(member.id)) ? (
                <p role="status" className="font-mono text-[10.5px] text-ink-soft">
                  All organisation members are already on this project.
                </p>
              ) : null}
            </div>
          </Field>
          <button
            type="button"
            aria-label="Add a new organisation member"
            className="font-mono text-[10.5px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            onClick={() => {
              setSelectedMemberIds([]);
              setAddMemberOpen(false);
              setNewMemberForm({ name: "", role: "", email: "" });
              setNewMemberOpen(true);
            }}
          >
            New person not listed? Add organisation member →
          </button>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <GhostButton
              onClick={() => {
                setSelectedMemberIds([]);
                setAddMemberOpen(false);
              }}
            >
              Cancel
            </GhostButton>
            <PrimaryButton
              disabled={selectedMemberIds.length === 0}
              onClick={() => {
                const selectedIds = selectedMemberIds.filter((id) => !project.memberIds.includes(id));
                if (selectedIds.length === 0) {
                  toast.error("Choose at least one member");
                  return;
                }
                const selectedMembers = members.filter((member) => selectedIds.includes(member.id));
                if (selectedMembers.length === 0) {
                  toast.error("No valid organisation members selected");
                  return;
                }
                store.updateProject(project.id, {
                  memberIds: [...project.memberIds, ...selectedMembers.map((member) => member.id)],
                });
                toast.success(`${selectedMembers.length} member${selectedMembers.length === 1 ? "" : "s"} added to project`);
                setSelectedMemberIds([]);
                setAddMemberOpen(false);
              }}
            >
              {selectedMemberIds.length > 0 ? `Add ${selectedMemberIds.length} to project` : "Add to project"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
      <Modal open={newMemberOpen} title="Add new organisation member" onClose={() => setNewMemberOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput
              autoFocus
              value={newMemberForm.name}
              onChange={(event) => setNewMemberForm({ ...newMemberForm, name: event.target.value })}
              placeholder="Full name"
            />
          </Field>
          <Field label="Role">
            <TextInput
              value={newMemberForm.role}
              onChange={(event) => setNewMemberForm({ ...newMemberForm, role: event.target.value })}
              placeholder="Design lead"
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={newMemberForm.email}
              onChange={(event) => setNewMemberForm({ ...newMemberForm, email: event.target.value })}
              placeholder="name@example.com"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setNewMemberOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => {
                const name = newMemberForm.name.trim();
                if (!name) {
                  toast.error("A name is required");
                  return;
                }
                const created = store.addMember({
                  orgId: project.orgId,
                  name,
                  role: newMemberForm.role.trim(),
                  email: newMemberForm.email.trim(),
                });
                store.updateProject(project.id, {
                  memberIds: [...project.memberIds, created.id],
                });
                toast.success(`${created.name} added to project`);
                setNewMemberForm({ name: "", role: "", email: "" });
                setNewMemberOpen(false);
              }}
            >
              Add member
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ProjectStat({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "indigo" | "amber" | "emerald" | "violet";
  onClick?: () => void;
}) {
  const toneClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${toneClasses}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-300" />
    </button>
  );
}

function ProjectCard({ title, icon: Icon, action, children }: { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
        <Icon size={16} className="text-slate-400" />
        <span className="text-[13.5px] font-semibold text-slate-900">{title}</span>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <div className="space-y-2 p-4">{children}</div>
    </div>
  );
}

function ProjectActionsMenu({
  trigger,
  onEdit,
  onDelete,
  align = "right",
}: {
  trigger: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block" onClick={() => setOpen((value) => !value)}>
      {trigger}
      {open ? (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={14} /> Edit project
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={14} /> Delete project
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DecisionsTab({ decisions, members }: { decisions: ReturnType<typeof useStore>["db"]["decisions"]; members: Member[] }) {
  return (
    <div className="space-y-2.5">
      {decisions.length === 0 ? <Empty text="No decisions recorded" /> : null}
      {decisions.map((decision) => (
        <div key={decision.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium">{decision.title}</span>
            <span className="ml-auto">
              <Pill tone={decision.status === "approved" ? "verd" : decision.status === "rejected" ? "rose" : "amber"}>{decision.status}</Pill>
            </span>
          </div>
          <p className="mt-1.5 text-[12.5px] text-slate-500">{decision.rationale || "No rationale recorded."}</p>
          <div className="mt-1.5 text-[9.5px] text-slate-400">
            {members.find((m) => m.id === decision.decidedById)?.name ?? "—"} · {decision.date}
          </div>
        </div>
      ))}
      <Link to="/decisions" className="inline-block text-xs font-medium text-indigo-600 hover:underline">
        Log a decision →
      </Link>
    </div>
  );
}

function TeamTab({
  assignedMembers,
  members,
  project,
  onAddMember,
  onRemoveMember,
}: {
  assignedMembers: Member[];
  members: Member[];
  project: Project;
  onAddMember: () => void;
  onRemoveMember: (memberId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold text-slate-900">Team</div>
          <div className="text-[11px] text-slate-500">
            {assignedMembers.length} assigned · {members.length} in organisation
          </div>
        </div>
        <GhostButton onClick={onAddMember}>+ Add member</GhostButton>
      </div>
      {assignedMembers.map((member) => (
        <div key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div className="grid size-8 place-items-center rounded-full bg-accent-soft text-[11px] text-accent">{member.name.slice(0, 1)}</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">{member.name}</div>
            <div className="text-[10px] text-slate-500">{member.role}</div>
          </div>
          <div className="ml-auto">
            <GhostButton onClick={() => onRemoveMember(member.id)}>Remove</GhostButton>
          </div>
        </div>
      ))}
      {assignedMembers.length === 0 ? <Empty text="No project team members yet" /> : null}
    </div>
  );
}

function EditProjectModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const { db, updateProject } = useStore();
  const project = db.projects.find((p) => p.id === projectId)!;
  const members = db.members.filter((m) => m.orgId === project.orgId);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    status: ProjectStatus;
    ownerId: string;
    startDate: string;
    dueDate: string;
  }>({
    name: project.name,
    description: project.description,
    status: project.status,
    ownerId: project.ownerId ?? "",
    startDate: project.startDate,
    dueDate: project.dueDate,
  });

  if (!open) return null;

  return (
    <Modal open={open} title="Edit project" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Owner">
            <SelectInput value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Start date">
            <TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            onClick={() => {
              updateProject(projectId, { ...form, ownerId: form.ownerId || null });
              toast.success("Project updated");
              onClose();
            }}
          >
            Save changes
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function EditLinksModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
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

function PlanningTab({ projectId }: { projectId: string }) {
  const { db, addTask, updateTask, removeTask, addMilestone, updateMilestone, removeMilestone } = useStore();
  const project = db.projects.find((p) => p.id === projectId)!;
  const tasks = db.tasks.filter((t) => t.projectId === projectId);
  const milestones = db.milestones.filter((m) => m.projectId === projectId).sort((a, b) => a.date.localeCompare(b.date));
  const members = db.members.filter((m) => m.orgId === project.orgId);

  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("Build");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [assigneeId, setAssigneeId] = useState("");
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDelete = tasks.find((t) => t.id === pendingDeleteId);

  const phases = Array.from(new Set(tasks.map((t) => t.phase || "Unsorted")));

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <ConfirmModal
        open={pendingDelete !== undefined}
        title="Delete this task?"
        description={`"${pendingDelete?.title ?? ""}" will be permanently deleted. This can't be undone.`}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeTask(pendingDelete.id);
          toast.success("Task deleted");
        }}
      />
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="label-mono mb-3">Add a task</div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
            <PrimaryButton
              onClick={() => {
                if (!title.trim()) return;
                addTask({
                  orgId: project.orgId,
                  projectId,
                  title: title.trim(),
                  phase: phase.trim() || "Unsorted",
                  done: false,
                  priority,
                  dueDate,
                  assigneeId: assigneeId || null,
                });
                setTitle("");
                toast.success("Task added");
              }}
            >
              Add task
            </PrimaryButton>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <TextInput value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Phase" />
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <SelectInput value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </SelectInput>
            <SelectInput value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        {phases.length === 0 ? <Empty text="No tasks planned yet" /> : null}

        {phases.map((ph) => (
          <div key={ph} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="label-mono mb-2">{ph}</div>
            <div className="space-y-1">
              {tasks
                .filter((t) => (t.phase || "Unsorted") === ph)
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => updateTask(t.id, { done: e.target.checked })}
                      className="size-4 accent-[oklch(0.535_0.193_266)]"
                    />
                    <span className={`truncate text-[13px] ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</span>
                    {t.priority === "high" ? <Pill tone="rose">high</Pill> : null}
                    <select
                      aria-label={`Assignee for ${t.title}`}
                      value={t.assigneeId ?? ""}
                      onChange={(e) => updateTask(t.id, { assigneeId: e.target.value || null })}
                      className="ml-auto max-w-32 truncate bg-transparent text-[10px] text-slate-500 outline-none hover:text-slate-800"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400">{t.dueDate || "—"}</span>
                    <button onClick={() => setPendingDeleteId(t.id)} aria-label={`Delete ${t.title}`} className="text-[10px] text-slate-400 hover:text-rose">
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="label-mono mb-3">Milestones</div>
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.done}
                onChange={(e) => updateMilestone(m.id, { done: e.target.checked })}
                className="size-4 accent-[oklch(0.608_0.113_160)]"
              />
              <span className={`truncate text-[12.5px] ${m.done ? "text-ink-soft line-through" : ""}`}>{m.title}</span>
              <span className="ml-auto text-[9.5px] text-slate-400">{formatDate(m.date)}</span>
              <button onClick={() => removeMilestone(m.id)} className="text-[10px] text-slate-400 hover:text-rose">
                ✕
              </button>
            </div>
          ))}
          {milestones.length === 0 ? <Empty text="No milestones" /> : null}
        </div>
        <div className="mt-3 space-y-2">
          <TextInput value={msTitle} onChange={(e) => setMsTitle(e.target.value)} placeholder="Milestone name" />
          <TextInput type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} />
          <GhostButton
            onClick={() => {
              if (!msTitle.trim() || !msDate) {
                toast.error("Milestone needs a name and a date");
                return;
              }
              addMilestone({ projectId, title: msTitle.trim(), date: msDate, done: false });
              setMsTitle("");
              setMsDate("");
            }}
          >
            Add milestone
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
