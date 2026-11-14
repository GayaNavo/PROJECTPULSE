import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export function register(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export function signOutUser(): Promise<void> {
  return signOut(getFirebaseAuth());
}
