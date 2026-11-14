export type TaskStatus = "todo" | "in_progress" | "blocked" | "in_review" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  dueDate?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  checklist: ChecklistItem[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProjectActivity {
  id: string;
  actorId: string;
  actorName: string;
  type: string;
  message: string;
  createdAt?: { toDate: () => Date };
}

export interface ProjectComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt?: { toDate: () => Date };
}
