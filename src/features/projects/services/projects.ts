import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Project, ProjectPriority, ProjectStatus } from "../types/project";

export type NewProject = Pick<Project, "name" | "description" | "priority" | "startDate" | "targetDate">;

export async function listProjects(uid: string, role: ProjectRole): Promise<Project[]> {
  const db = getFirebaseDb();
  const projects = collection(db, "projects");
  if (role === "super_admin" || role === "ceo") {
    const snapshot = await getDocs(projects);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Project);
  }

  const [managed, member] = await Promise.all([
    getDocs(query(projects, where("managerId", "==", uid))),
    getDocs(query(projects, where("memberIds", "array-contains", uid))),
  ]);
  const unique = new Map<string, Project>();
  for (const item of [...managed.docs, ...member.docs]) {
    unique.set(item.id, { id: item.id, ...item.data() } as Project);
  }
  return [...unique.values()];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "projects", projectId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Project) : null;
}

export async function createProject(
  input: NewProject,
  manager: { uid: string; displayName: string },
): Promise<string> {
  const db = getFirebaseDb();
  const projectRef = doc(collection(db, "projects"));
  const batch = writeBatch(db);
  batch.set(projectRef, {
    ...input,
    status: "active" satisfies ProjectStatus,
    managerId: manager.uid,
    managerName: manager.displayName,
    memberIds: [manager.uid],
    forecastDate: input.targetDate,
    createdBy: manager.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  await addDoc(collection(db, "projects", projectRef.id, "activity"), {
    actorId: manager.uid,
    actorName: manager.displayName,
    type: "project_created",
    message: "created this project",
    createdAt: serverTimestamp(),
  });
  return projectRef.id;
}

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, "name" | "description" | "status" | "priority" | "startDate" | "forecastDate">> & { deadlineChangeReason?: string },
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const projectRef = doc(db, "projects", projectId);
  const existing = await getDoc(projectRef);
  if (!existing.exists()) throw new Error("Project not found.");
  const previousForecast = existing.data().forecastDate as string | undefined;
  const forecastChanged = typeof patch.forecastDate === "string" && patch.forecastDate !== previousForecast;
  if (forecastChanged && !patch.deadlineChangeReason?.trim()) {
    throw new Error("Provide a reason when changing the forecast completion date.");
  }
  const { deadlineChangeReason, ...projectPatch } = patch;
  const batch = writeBatch(db);
  batch.update(projectRef, {
    ...projectPatch,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  const activityRef = doc(collection(db, "projects", projectId, "activity"));
  batch.set(activityRef, {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "project_updated",
    message: forecastChanged
      ? `updated the forecast completion date from ${previousForecast || "not set"} to ${patch.forecastDate}: ${deadlineChangeReason?.trim()}`
      : patch.status ? `changed project status to ${patch.status.replaceAll("_", " ")}` : "updated project details",
    ...(forecastChanged ? { changes: { forecastDate: { from: previousForecast || null, to: patch.forecastDate, reason: deadlineChangeReason?.trim() } } } : {}),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateProjectMembers(
  projectId: string,
  memberIds: string[],
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "projects", projectId), {
    memberIds: [...new Set(memberIds)],
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "projects", projectId, "activity")), {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "project_members_updated",
    message: "updated project access",
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

type ProjectRole = "super_admin" | "ceo" | "project_manager" | "team_lead" | "team_member";
export type { ProjectPriority, ProjectStatus };
