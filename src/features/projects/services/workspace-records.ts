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
import type { WorkspaceCollection, WorkspaceRecord } from "../types/workspace-records";

export async function listWorkspaceRecords<T extends WorkspaceRecord>(projectId: string, collectionName: WorkspaceCollection): Promise<T[]> {
  const records = query(collection(getFirebaseDb(), "projects", projectId, collectionName), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(records);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function createWorkspaceRecord(
  projectId: string,
  collectionName: WorkspaceCollection,
  input: Record<string, unknown>,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const recordRef = doc(collection(db, "projects", projectId, collectionName));
  const activityRef = doc(collection(db, "projects", projectId, "activity"));
  const batch = writeBatch(db);
  batch.set(recordRef, {
    ...input,
    ownerId: actor.uid,
    ownerName: actor.displayName,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(activityRef, {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: `${collectionName}_created`,
    message: `added a ${collectionName === "supportRequests" ? "business support request" : collectionName.slice(0, -1)}`,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateWorkspaceRecord(
  projectId: string,
  collectionName: WorkspaceCollection,
  recordId: string,
  patch: Record<string, unknown>,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "projects", projectId, collectionName, recordId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
  const activityRef = doc(collection(db, "projects", projectId, "activity"));
  batch.set(activityRef, {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: `${collectionName}_updated`,
    message: `updated a ${collectionName === "supportRequests" ? "business support request" : collectionName.slice(0, -1)}`,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function deleteWorkspaceRecord(
  projectId: string,
  collectionName: WorkspaceCollection,
  recordId: string,
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, "projects", projectId, collectionName, recordId));
  const activityRef = doc(collection(db, "projects", projectId, "activity"));
  batch.set(activityRef, {
    actorId: actor.uid,
    actorName: actor.displayName,
    type: `${collectionName}_deleted`,
    message: `removed a ${collectionName === "supportRequests" ? "business support request" : collectionName.slice(0, -1)}`,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}
