"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "../context/auth-context";
import { listUserProfiles, updateUserAccess } from "../services/users";
import type { UserProfile, UserRole } from "../types/user";
import { listProjects } from "@/features/projects/services/projects";
import type { Project } from "@/features/projects/types/project";

const roles: UserRole[] = ["super_admin", "ceo", "project_manager", "team_lead", "team_member"];
const roleNames: Record<UserRole, string> = { super_admin: "Super Admin", ceo: "CEO / Executive", project_manager: "Project Manager", team_lead: "Team Lead", team_member: "Team Member" };
const dateLabel = (value?: { toDate: () => Date }) => value?.toDate ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(value.toDate()) : "—";

type Draft = { role: UserRole; active: boolean };

export function UserManagement() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (profile?.role !== "super_admin" || !user) return;
    let active = true;
    Promise.all([listUserProfiles(), listProjects(user.uid, profile.role)])
      .then(([nextUsers, nextProjects]) => {
        if (!active) return;
        setUsers(nextUsers);
        setProjects(nextProjects);
        setDrafts(Object.fromEntries(nextUsers.map((item) => [item.uid, { role: item.role, active: item.active }])));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load user accounts.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile, user]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((item) => !query || `${item.displayName} ${item.email} ${roleNames[item.role]}`.toLowerCase().includes(query));
  }, [users, search]);

  async function saveUser(target: UserProfile) {
    const draft = drafts[target.uid];
    if (!user || !profile || !draft) return;
    if (target.role === "super_admin" && (!draft.active || draft.role !== "super_admin")) {
      setError("A Super Admin account cannot be deactivated or demoted here.");
      return;
    }
    if (target.active && !draft.active && !window.confirm(`Deactivate ${target.displayName}? They will lose access to ProjectPulse.`)) return;
    setSavingUid(target.uid);
    setError("");
    setNotice("");
    try {
      await updateUserAccess(target.uid, draft, { uid: user.uid, displayName: profile.displayName });
      setUsers((current) => current.map((item) => item.uid === target.uid ? { ...item, ...draft } : item));
      setNotice(`Access settings saved for ${target.displayName}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this user.");
    } finally {
      setSavingUid("");
    }
  }

  const projectCount = (profileUid: string) => projects.filter((project) => project.managerId === profileUid || project.memberIds?.includes(profileUid)).length;

  if (profile?.role !== "super_admin") {
    return <AppShell><section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-xl font-semibold">Administrator access required</h1><p className="mt-2 text-sm text-slate-500">Your account does not have permission to manage users.</p></section></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-indigo-600">Administration</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">User management</h1><p className="mt-2 text-sm text-slate-500">Review account access, roles, and project assignments.</p></div><div className="rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-800">Create/invite accounts in Firebase Authentication. New profiles start with the least-privilege Team Member role.</div></header>
        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-semibold">Accounts</h2><p className="mt-1 text-xs text-slate-500">{users.length} profile{users.length === 1 ? "" : "s"} · roles are enforced by Firestore rules</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search users" placeholder="Search people…" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:w-64" /></div>
          {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mx-5 mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
          {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading user directory…</p> : filteredUsers.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No user profiles match this search.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Projects</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((item) => {
            const draft = drafts[item.uid] || { role: item.role, active: item.active };
            const isSuperAdmin = item.role === "super_admin";
            return <tr key={item.uid} className="align-middle"><td className="px-5 py-4"><p className="font-semibold text-slate-800">{item.displayName}</p><p className="mt-0.5 text-xs text-slate-500">{item.email}</p></td><td className="px-4 py-4"><select disabled={isSuperAdmin} aria-label={`Role for ${item.displayName}`} value={draft.role} onChange={(event) => setDrafts((current) => ({ ...current, [item.uid]: { ...draft, role: event.target.value as UserRole } }))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs disabled:bg-slate-50">{roles.map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{draft.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-4 text-slate-600">{projectCount(item.uid)}</td><td className="px-4 py-4 text-slate-500">{dateLabel(item.createdAt)}</td><td className="px-4 py-4 text-slate-500">{dateLabel(item.lastLoginAt)}</td><td className="px-4 py-4"><div className="flex items-center gap-2"><select disabled={isSuperAdmin} aria-label={`Account status for ${item.displayName}`} value={draft.active ? "active" : "inactive"} onChange={(event) => setDrafts((current) => ({ ...current, [item.uid]: { ...draft, active: event.target.value === "active" } }))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs disabled:opacity-50"><option value="active">Active</option><option value="inactive">Inactive</option></select><button disabled={savingUid === item.uid || (draft.role === item.role && draft.active === item.active)} onClick={() => void saveUser(item)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{savingUid === item.uid ? "Saving…" : "Save"}</button></div></td></tr>;
          })}</tbody></table></div>}
        </section>
        <p className="mt-4 text-xs leading-5 text-slate-500">Super Admin accounts cannot be disabled or demoted in this screen, preventing accidental loss of the final administrator. Account creation and password lifecycle remain in Firebase Authentication.</p>
      </div>
    </AppShell>
  );
}
