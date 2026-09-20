import type { Database } from "./types";

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const stamp = (offsetHours: number) => {
  const d = new Date(today);
  d.setHours(d.getHours() - offsetHours);
  return d.toISOString();
};

export const seedDatabase = (): Database => ({
  organisations: [
    {
      id: "org-elance",
      name: "Elance",
      description: "Freelance marketplace venture — design, platform and client delivery.",
      createdAt: stamp(24 * 200),
    },
    {
      id: "org-northwind",
      name: "Northwind",
      description: "Consulting arm handling retainer clients.",
      createdAt: stamp(24 * 90),
    },
  ],
  members: [
    { id: "m-1", orgId: "org-elance", name: "Mohammed Suhail", role: "Owner", email: "suhail@elance.co" },
    { id: "m-2", orgId: "org-elance", name: "D. Reyes", role: "Design lead", email: "reyes@elance.co" },
    { id: "m-3", orgId: "org-elance", name: "K. Osei", role: "Engineer", email: "osei@elance.co" },
    { id: "m-4", orgId: "org-northwind", name: "L. Voss", role: "Strategist", email: "voss@northwind.co" },
  ],
  projects: [
    {
      id: "p-1",
      orgId: "org-elance",
      name: "Brand Refresh 2025",
      description: "New identity system, typography and rollout across all client touchpoints.",
      status: "in_progress",
      ownerId: "m-2",
      memberIds: ["m-1", "m-2", "m-3"],
      startDate: iso(-40),
      dueDate: iso(35),
      createdAt: stamp(24 * 40),
    },
    {
      id: "p-2",
      orgId: "org-elance",
      name: "Q3 Site Migration",
      description: "Move the marketplace front-end to an edge-rendered stack.",
      status: "review",
      ownerId: "m-3",
      memberIds: ["m-1", "m-3"],
      startDate: iso(-20),
      dueDate: iso(20),
      createdAt: stamp(24 * 20),
    },
    {
      id: "p-3",
      orgId: "org-northwind",
      name: "Client Onboarding Kit",
      description: "Standardised onboarding pack for new retainer clients.",
      status: "planning",
      ownerId: "m-4",
      memberIds: ["m-4"],
      startDate: iso(-5),
      dueDate: iso(60),
      createdAt: stamp(24 * 5),
    },
  ],
  tasks: [
    { id: "t-1", orgId: "org-elance", projectId: "p-1", title: "Lock type scale", phase: "Design", done: true, priority: "high", dueDate: iso(-6), assigneeId: "m-2", createdAt: stamp(200) },
    { id: "t-2", orgId: "org-elance", projectId: "p-1", title: "Build token library", phase: "Design", done: false, priority: "high", dueDate: iso(4), assigneeId: "m-2", createdAt: stamp(120) },
    { id: "t-3", orgId: "org-elance", projectId: "p-1", title: "Roll out to marketing pages", phase: "Rollout", done: false, priority: "normal", dueDate: iso(18), assigneeId: "m-3", createdAt: stamp(90) },
    { id: "t-4", orgId: "org-elance", projectId: "p-2", title: "Audit current routes", phase: "Discovery", done: true, priority: "normal", dueDate: iso(-10), assigneeId: "m-3", createdAt: stamp(300) },
    { id: "t-5", orgId: "org-elance", projectId: "p-2", title: "Edge render spike", phase: "Build", done: false, priority: "high", dueDate: iso(3), assigneeId: "m-3", createdAt: stamp(60) },
    { id: "t-6", orgId: "org-elance", projectId: null, title: "Renew company registration", phase: "Admin", done: false, priority: "high", dueDate: iso(9), assigneeId: "m-1", createdAt: stamp(40) },
    { id: "t-7", orgId: "org-northwind", projectId: "p-3", title: "Draft welcome pack", phase: "Discovery", done: false, priority: "normal", dueDate: iso(12), assigneeId: "m-4", createdAt: stamp(30) },
  ],
  milestones: [
    { id: "ms-1", projectId: "p-1", title: "Identity approved", date: iso(-12), done: true },
    { id: "ms-2", projectId: "p-1", title: "Token library shipped", date: iso(10), done: false },
    { id: "ms-3", projectId: "p-1", title: "Full rollout", date: iso(35), done: false },
    { id: "ms-4", projectId: "p-2", title: "Staging cutover", date: iso(8), done: false },
    { id: "ms-5", projectId: "p-3", title: "Kit v1 ready", date: iso(45), done: false },
  ],
  docs: [
    { id: "d-1", orgId: "org-elance", projectId: "p-1", title: "Brand guidelines v2", kind: "Spec", link: "", ownerId: "m-2", notes: "Master reference for the new identity.", updatedAt: stamp(2) },
    { id: "d-2", orgId: "org-elance", projectId: "p-1", title: "Moodboard — final", kind: "Reference", link: "", ownerId: "m-2", notes: "", updatedAt: stamp(26) },
    { id: "d-3", orgId: "org-elance", projectId: "p-2", title: "Migration runbook", kind: "Runbook", link: "", ownerId: "m-3", notes: "Step-by-step cutover plan.", updatedAt: stamp(70) },
    { id: "d-4", orgId: "org-northwind", projectId: "p-3", title: "Client intake form", kind: "Template", link: "", ownerId: "m-4", notes: "", updatedAt: stamp(120) },
  ],
  meetings: [
    { id: "mt-1", orgId: "org-elance", projectId: "p-1", title: "Brand kickoff", date: iso(2), time: "10:00", attendeeIds: ["m-1", "m-2", "m-3"], notes: "Agenda: rollout order, print assets, launch date." },
    { id: "mt-2", orgId: "org-elance", projectId: "p-2", title: "Migration review", date: iso(5), time: "15:30", attendeeIds: ["m-1", "m-3"], notes: "" },
    { id: "mt-3", orgId: "org-northwind", projectId: "p-3", title: "Onboarding sync", date: iso(9), time: "09:00", attendeeIds: ["m-4"], notes: "" },
  ],
  decisions: [
    { id: "dec-1", orgId: "org-elance", projectId: "p-1", title: "Adopt v2 token set", status: "approved", rationale: "Cleaner contrast and one source of truth for colour.", decidedById: "m-2", date: iso(-2) },
    { id: "dec-2", orgId: "org-elance", projectId: "p-2", title: "Migrate to edge rendering", status: "approved", rationale: "Cuts first-load time roughly in half.", decidedById: "m-3", date: iso(-7) },
    { id: "dec-3", orgId: "org-northwind", projectId: "p-3", title: "Defer onboarding rewrite", status: "open", rationale: "Waiting on budget confirmation.", decidedById: "m-4", date: iso(-5) },
  ],
  activity: [
    { id: "a-1", orgId: "org-elance", projectId: "p-1", text: "D. Reyes uploaded Brand guidelines v2", tone: "accent", at: stamp(2) },
    { id: "a-2", orgId: "org-elance", projectId: "p-2", text: "K. Osei closed Audit current routes", tone: "verd", at: stamp(6) },
    { id: "a-3", orgId: "org-elance", projectId: "p-1", text: "Decision opened: Adopt v2 token set", tone: "amber", at: stamp(30) },
    { id: "a-4", orgId: "org-northwind", projectId: "p-3", text: "L. Voss joined Client Onboarding Kit", tone: "line", at: stamp(50) },
  ],
});
