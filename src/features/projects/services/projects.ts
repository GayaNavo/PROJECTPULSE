import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Project } from "../types/project";

export async function listProjects(): Promise<Project[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), "projects"));
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Project[];
}
