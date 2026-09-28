import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronDown, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useHeaderActions } from "@/components/app-shell";
import { CredentialsPanel } from "@/components/credentials-panel";
import { ConfirmModal } from "@/components/forms";
import { Empty } from "@/components/kit";
import { BoardTab } from "@/components/project/board-tab";
import { DecisionsTab } from "@/components/project/decisions-tab";
import { EditLinksModal } from "@/components/project/edit-links-modal";
import { EditProjectModal } from "@/components/project/edit-project-modal";
import { HistoryTab } from "@/components/project/history-tab";
import { MeetingsTab } from "@/components/project/meetings-tab";
import { OverviewTab } from "@/components/project/overview-tab";
import { PlanningTab } from "@/components/project/planning-tab";
import { ProjectActionsMenu } from "@/components/project/project-actions-menu";
import { ProjectHero } from "@/components/project/project-hero";
import { ProjectStatsGrid } from "@/components/project/project-stats";
import { TABS, type Tab } from "@/components/project/constants";
import { TeamTab } from "@/components/project/team-tab";
import { ProjectDocs } from "@/components/project-docs";
import { filtersFromSearch, searchFromFilters, type BoardFilters, type BoardSearch } from "@/lib/board";
import { countProjectCascade, describeCascade } from "@/lib/cascade-counts";
import { projectProgress, useStore } from "@/lib/store";

interface ProjectSearch extends BoardSearch {
  tab?: Tab | undefined;
  /** Work item open in the detail sheet. */
  task?: string;
}

export const Route = createFileRoute("/projects/$projectId")({
  validateSearch: (search: Record<string, unknown>): ProjectSearch => {
    const tab = search["tab"];
    const task = search["task"];
    return {
      tab: TABS.find((t) => t === tab && t !== "Overview"),
      ...searchFromFilters(filtersFromSearch(search)),
      ...(typeof task === "string" && task ? { task } : {}),
    };
  },
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

function ProjectDetail() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const store = useStore();
  const { db } = store;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/$projectId" });
  const tab: Tab = search.tab ?? "Overview";
  const setTab = (next: Tab) => void navigate({ search: (prev) => ({ ...prev, tab: next === "Overview" ? undefined : next }) });
  const setFilters = (filters: BoardFilters) =>
    void navigate({ search: (prev) => ({ tab: prev.tab, ...(prev.task ? { task: prev.task } : {}), ...searchFromFilters(filters) }), replace: true });
  const setOpenTask = (id: string | undefined) =>
    void navigate({ search: (prev) => { const { task: _open, ...rest } = prev; return id ? { ...rest, task: id } : rest; } });

  const [editOpen, setEditOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const inProgressTasks = openTasks.filter((task) => task.status === "in_progress" || task.status === "in_review");

  const cascadeCounts = countProjectCascade(db, project.id);

  return (
    <>
      <div className="min-h-full bg-paper px-5 py-5 md:px-8 md:py-6">
        <ProjectHero project={project} progress={progress} owner={owner} assignedMembers={assignedMembers} tab={tab} onTabChange={setTab} />

        {/* The board is its own overview of the work; keep it above the fold. */}
        {tab === "Board" ? null : (
          <ProjectStatsGrid
            openTasks={openTasks.length}
            inProgress={inProgressTasks.length}
            completed={completedTasks}
            team={assignedMembers.length}
            onTabChange={setTab}
          />
        )}

        {tab === "Board" ? (
          <BoardTab
            project={project}
            projects={db.projects.filter((p) => p.orgId === project.orgId)}
            tasks={tasks}
            members={members}
            filters={filtersFromSearch(search)}
            onFiltersChange={setFilters}
            openTaskId={search.task}
            onOpenTask={setOpenTask}
          />
        ) : null}

        {tab === "Overview" ? (
          <OverviewTab
            links={project.links}
            openTasks={openTasks}
            milestones={milestones}
            members={members}
            recentActivity={history.slice(0, 5)}
            onTabChange={setTab}
            onEditLinks={() => setLinksOpen(true)}
          />
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
          <div className="mt-4">
            <MeetingsTab meetings={meetings} />
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
            <TeamTab project={project} members={members} assignedMembers={assignedMembers} />
          </div>
        ) : null}

        {tab === "History" ? (
          <div className="mt-4">
            <HistoryTab history={history} />
          </div>
        ) : null}
      </div>

      <EditProjectModal open={editOpen} onClose={() => setEditOpen(false)} projectId={project.id} />
      <EditLinksModal open={linksOpen} onClose={() => setLinksOpen(false)} projectId={project.id} />
      <ConfirmModal
        open={deleteOpen}
        title="Delete project?"
        description={`This permanently deletes "${project.name}" and everything in it: ${describeCascade(cascadeCounts)}. This can't be undone.`}
        confirmLabel="Delete project"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          store.removeProject(project.id);
          toast.success("Project deleted");
        }}
      />
    </>
  );
}
