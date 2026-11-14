export type UserRole = "super_admin" | "ceo" | "project_manager" | "team_lead" | "team_member";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt?: { toDate: () => Date };
  lastLoginAt?: { toDate: () => Date };
}
