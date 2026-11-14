"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/context/auth-context";
import { listUserProfiles } from "@/features/auth/services/users";
import type { UserProfile } from "@/features/auth/types/user";
import { updateProjectMembers } from "../services/projects";

export function ProjectTeamEditor({
  projectId,
  managerId,
  memberIds,
  onSaved,
}: {
  projectId: string;
  managerId: string;
  memberIds: string[];
  onSaved: () => Promise<void>;
}) {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<string[]>(memberIds);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.role !== "super_admin") return;
    let active = true;
    listUserProfiles()
      .then((result) => { if (active) setUsers(result.filter((item) => item.active)); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load users."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile]);

  if (profile?.role !== "super_admin") return null;

  function toggle(uid: string) {
    if (uid === managerId) return;
    setSaved(false);
    setSelected((current) => current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]);
  }

  async function save() {
    if (!user || !profile) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateProjectMembers(projectId, [...new Set([...selected, managerId])], { uid: user.uid, displayName: profile.displayName });
      setSaved(true);
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update project access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800">Project access</h3><p className="mt-1 text-xs text-slate-500">Only active users selected here can open this project. The project manager always retains access.</p></div><button type="button" disabled={saving || loading} onClick={() => void save()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save access"}</button></div>
  {loading ? <p className="mt-4 text-sm text-slate-500">Loading users…</p> : <div className="mt-4 grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">{users.map((item) => <label key={item.uid} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"><input type="checkbox" checked={selected.includes(item.uid) || item.uid === managerId} disabled={item.uid === managerId} onChange={() => toggle(item.uid)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><span className="min-w-0 flex-1 truncate text-slate-700">{item.displayName}</span><span className="truncate text-xs text-slate-400">{item.email}</span></label>)}</div>}
  {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}{saved && <p role="status" className="mt-3 text-xs text-emerald-700">Project access updated.</p>}
    </section>
  );
}
