export const TABS = ["Overview", "Planning", "Documents", "Meetings", "Decisions", "Credentials", "Team", "History"] as const;
export type Tab = (typeof TABS)[number];
