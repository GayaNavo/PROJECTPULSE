"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import type { UserProfile, UserRole } from "../types/user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  status: AuthStatus;
  error: string | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(uid: string, value: Record<string, unknown>, user: User): UserProfile {
  return {
    uid,
    displayName:
      typeof value.displayName === "string" && value.displayName.trim()
        ? value.displayName
        : user.displayName || user.email?.split("@")[0] || "ProjectPulse user",
    email: typeof value.email === "string" ? value.email : user.email || "",
    role: (typeof value.role === "string" ? value.role : "team_member") as UserRole,
    active: value.active !== false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const snapshot = await getDoc(doc(getFirebaseDb(), "users", currentUser.uid));
    if (snapshot.exists()) {
      setProfile(mapProfile(currentUser.uid, snapshot.data(), currentUser));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initializeAuthListener = async () => {
      await Promise.resolve();
      if (!mounted) return;
      try {
        const auth = getFirebaseAuth();
        const db = getFirebaseDb();
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!mounted) return;
        setUser(currentUser);
        setError(null);
        if (!currentUser) {
          setProfile(null);
          setStatus("unauthenticated");
          return;
        }

        setStatus("loading");
        try {
          const profileRef = doc(db, "users", currentUser.uid);
          let profileSnapshot = await getDoc(profileRef);
          if (!profileSnapshot.exists()) {
            await setDoc(profileRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "ProjectPulse user",
              email: currentUser.email || "",
              role: "team_member",
              active: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            profileSnapshot = await getDoc(profileRef);
          }

          const nextProfile = mapProfile(currentUser.uid, profileSnapshot.data() || {}, currentUser);
          if (!nextProfile.active) {
            setError("This account is deactivated. Contact your administrator.");
            await signOut(auth);
            return;
          }
          await updateDoc(profileRef, { lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() });
          if (mounted) {
            setProfile(nextProfile);
            setStatus("authenticated");
          }
        } catch (cause) {
          if (mounted) {
            setError(cause instanceof Error ? cause.message : "Unable to load your account profile.");
            setStatus("unauthenticated");
          }
        }
        });
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : "Firebase configuration is unavailable.");
          setStatus("unauthenticated");
        }
      }
    };

    void initializeAuthListener();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({ user, profile, status, error, refreshProfile }),
    [user, profile, status, error, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
