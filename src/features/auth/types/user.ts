export type UserRole = "admin" | "executive" | "manager" | "member";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}
