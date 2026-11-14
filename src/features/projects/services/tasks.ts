import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ProjectActivity, ProjectTask } from "../types/task";
import type { TaskPriority, TaskStatus } from "../types/task";

export type NewTask = Pick<ProjectTask, "title" | "description" | "assigneeId" | "dueDate" | "priority">;

export async function listProjectTasks(projectId: string): Promise<ProjectTask[]> {
  const tasksQuery = query(collection(getFirebaseDb(), "projects", projectId, "tasks"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(tasksQuery);
  return snapshot.docs.map((item) => ({ id: item.id, projectId, ...item.data() }) as ProjectTask);
}

export async function createProjectTask(
  projectId: string,
  input: NewTask,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const taskRef = doc(collection(db, "projects", projectId, "tasks"));
  const activityRef = doc(collection(db, "projects", projectId, "activity"));
  batch.set(taskRef, {
    ...input,
    projectId,
    status: "todo" satisfies TaskStatus,
    progress: 0,
    checklist: [],
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(activityRef, {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "task_created",
    message: `created task “${input.title}”`,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateProjectTask(
  projectId: string,
  taskId: string,
  patch: Partial<Pick<ProjectTask, "title" | "description" | "assigneeId" | "dueDate" | "priority" | "status" | "progress" | "checklist">>,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "projects", projectId, "tasks", taskId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
  const activityRef = doc(collection(db, "projects", projectId, "activity"));
  const summary = patch.status ? `changed a task to ${patch.status.replaceAll("_", " ")}` : "updated a task";
  batch.set(activityRef, {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "task_updated",
    message: summary,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function deleteProjectTask(
  projectId: string,
  taskId: string,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, "projects", projectId, "tasks", taskId));
  const activityRef = doc(collection(db, "projects", projectId, "activity"));
  batch.set(activityRef, {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "task_deleted",
    message: "deleted a task",
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function listProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  const activityQuery = query(collection(getFirebaseDb(), "projects", projectId, "activity"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(activityQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ProjectActivity);
}

export async function addProjectComment(
  projectId: string,
  actor: { uid: string; displayName: string },
  body: string,
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "projects", projectId, "comments")), {
    authorId: actor.uid,
    authorName: actor.displayName,
    body: body.trim(),
    createdAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "projects", projectId, "activity")), {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "comment_added",
    message: "added to the project discussion",
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateProjectComment(
  projectId: string,
  commentId: string,
  body: string,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "projects", projectId, "comments", commentId), {
    body: body.trim(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "projects", projectId, "activity")), {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "comment_updated",
    message: "edited a project discussion comment",
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function deleteProjectComment(
  projectId: string,
  commentId: string,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, "projects", projectId, "comments", commentId));
  batch.set(doc(collection(db, "projects", projectId, "activity")), {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: "comment_deleted",
    message: "removed a project discussion comment",
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function listProjectComments(projectId: string) {
  const commentsQuery = query(collection(getFirebaseDb(), "projects", projectId, "comments"), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(commentsQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as import("../types/task").ProjectComment[];
}

export type { TaskPriority, TaskStatus };
