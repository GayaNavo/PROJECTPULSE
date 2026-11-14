import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { UserProfile, UserRole } from "../types/user";

export async function listUserProfiles(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), "users"));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      uid: item.id,
      displayName: typeof data.displayName === "string" ? data.displayName : "Unnamed user",
      email: typeof data.email === "string" ? data.email : "",
      role: data.role as UserRole,
      active: data.active === true,
      createdAt: data.createdAt,
      lastLoginAt: data.lastLoginAt,
    };
  });
}

export async function updateUserAccess(
  targetUid: string,
  values: { role: UserRole; active: boolean },
  actor: { uid: string; displayName: string },
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "users", targetUid), {
    ...values,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "auditLogs")), {
    actorId: actor.uid,
    actorName: actor.displayName,
    action: "user_access_updated",
    targetId: targetUid,
    changes: values,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}
