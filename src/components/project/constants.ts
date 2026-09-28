export const TABS = ["Board", "Overview", "Planning", "Documents", "Meetings", "Decisions", "Credentials", "Team", "History"] as const;
export type Tab = (typeof TABS)[number];
