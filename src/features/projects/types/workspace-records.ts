export type WorkspaceCollection = "milestones" | "blockers" | "supportRequests";
export type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "delayed";
export type BlockerStatus = "open" | "in_progress" | "resolved";
export type BlockerSeverity = "low" | "medium" | "high" | "critical";
export type SupportStatus = "pending" | "in_progress" | "fulfilled" | "rejected";
export type SupportPriority = "low" | "medium" | "high" | "urgent";

export interface WorkspaceRecord {
  id: string;
  title?: string;
  description?: string;
  dueDate?: string;
  status: string;
  ownerId: string;
  ownerName: string;
  createdBy: string;
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
  [key: string]: unknown;
}
