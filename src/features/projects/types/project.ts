export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  managerId: string;
  managerName: string;
  memberIds: string[];
  priority: ProjectPriority;
  startDate: string;
  targetDate: string;
  forecastDate: string;
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
}
