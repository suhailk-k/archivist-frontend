import { toast } from "sonner";
import { GhostButton } from "@/components/app-shell";
import { Empty, Panel, PanelHead, Stat } from "@/components/kit";
import { buildDailyPlan, shiftDateKey, type DateKey } from "@/lib/daily-plan";
import type { Task } from "@/lib/types";
import {
  dayLabel,
  firstName,
  percent,
  planNewTask,
  projectNameOf,
  QuickAdd,
  RowAction,
  TaskList,
  TaskRow,
  type PlannerContext,
} from "./parts";

const UNASSIGNED_PREVIEW_LIMIT = 8;

export function DayView({ ctx }: { ctx: PlannerContext }) {
  const { member, tasks, projects, today, updateTask } = ctx;
  const day = ctx.anchor;
  const plan = buildDailyPlan(tasks, { memberId: member.id, day, today });
  const unassigned = tasks.filter((t) => !t.done && !t.assigneeId).slice(0, UNASSIGNED_PREVIEW_LIMIT);
  const progress = percent(plan.done.length, plan.planned.length + plan.done.length);
  const projectName = projectNameOf(projects);
  const label = dayLabel(day, today);
  const name = firstName(member);

  const planFor = (task: Task, target: DateKey) => updateTask(task.id, { plannedFor: target });
  const moveAllCarriedOver = () => {
    plan.carriedOver.forEach((task) => planFor(task, day));
    toast.success(`${plan.carriedOver.length} moved to today`);
  };
  const rowProps = (task: Task) => ({ task, project: projectName(task), today, onToggle: updateTask });

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Planned" value={plan.planned.length} note="open" />
        <Stat label="Done" value={plan.done.length} tone="verd" note={`${progress}%`} />
        <Stat label="Carried over" value={plan.carriedOver.length} tone="amber" note="from earlier" />
        <Stat label="Backlog" value={plan.backlog.length} note="not scheduled" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <Panel>
            <QuickAdd
              projects={projects}
              placeholder={`What will ${name} get done ${label.toLowerCase()}?`}
              onAdd={(draft) => planNewTask(ctx, draft, day)}
            />
          </Panel>

          {plan.carriedOver.length > 0 ? (
            <Panel>
              <PanelHead
                title="Carried over"
                meta={`${plan.carriedOver.length} unfinished`}
                action={<GhostButton onClick={moveAllCarriedOver}>Move all to today</GhostButton>}
              />
              <TaskList>
                {plan.carriedOver.map((task) => (
                  <TaskRow key={task.id} {...rowProps(task)} showSchedule>
                    <RowAction onClick={() => planFor(task, day)}>Today</RowAction>
                    <RowAction onClick={() => planFor(task, "")}>Unplan</RowAction>
                  </TaskRow>
                ))}
              </TaskList>
            </Panel>
          ) : null}

          <Panel>
            <PanelHead title={`${label}'s plan`} meta={`${plan.planned.length} open`} />
            <TaskList>
              {plan.planned.length === 0 ? <Empty text="Nothing planned — pull from the backlog" /> : null}
              {plan.planned.map((task) => (
                <TaskRow key={task.id} {...rowProps(task)}>
                  <RowAction onClick={() => planFor(task, shiftDateKey(day, 1))}>Tomorrow</RowAction>
                  {task.plannedFor === day ? <RowAction onClick={() => planFor(task, "")}>Unplan</RowAction> : null}
                </TaskRow>
              ))}
            </TaskList>
          </Panel>

          <Panel>
            <PanelHead title="Done" meta={`${plan.done.length} finished`} />
            <TaskList>
              {plan.done.length === 0 ? <Empty text="Nothing finished yet" /> : null}
              {plan.done.map((task) => (
                <TaskRow key={task.id} {...rowProps(task)} />
              ))}
            </TaskList>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel>
            <PanelHead title="Backlog" meta={`${name}'s open work`} />
            <TaskList>
              {plan.backlog.length === 0 ? <Empty text="Backlog is clear" /> : null}
              {plan.backlog.map((task) => (
                <TaskRow key={task.id} {...rowProps(task)} showSchedule>
                  <RowAction onClick={() => planFor(task, day)}>+ {label}</RowAction>
                </TaskRow>
              ))}
            </TaskList>
          </Panel>

          <Panel>
            <PanelHead title="Unassigned" meta="up for grabs" />
            <TaskList>
              {unassigned.length === 0 ? <Empty text="Everything has an owner" /> : null}
              {unassigned.map((task) => (
                <TaskRow key={task.id} {...rowProps(task)}>
                  <RowAction onClick={() => updateTask(task.id, { assigneeId: member.id, plannedFor: day })}>Take</RowAction>
                </TaskRow>
              ))}
            </TaskList>
          </Panel>
        </div>
      </div>
    </>
  );
}
