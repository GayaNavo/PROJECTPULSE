"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/context/auth-context";
import { listProjects } from "../services/projects";
import type { Project } from "../types/project";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-amber-50 text-amber-700",
  completed: "bg-indigo-50 text-indigo-700",
  archived: "bg-slate-100 text-slate-500",
};

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function DashboardOverview() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !profile) return;
    let active = true;
    listProjects(user.uid, profile.role)
      .then((result) => { if (active) setProjects(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load project data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, profile]);

  const today = new Date().toISOString().slice(0, 10);
  const activeCount = projects.filter((item) => item.status === "active").length;
  const delayedCount = projects.filter((item) => item.status === "active" && item.targetDate && item.targetDate < today).length;
  const onHoldCount = projects.filter((item) => item.status === "on_hold").length;
  const completedCount = projects.filter((item) => item.status === "completed").length;
  const recent = [...projects].sort((a, b) => {
    const aTime = a.updatedAt?.toDate?.().getTime() ?? 0;
    const bTime = b.updatedAt?.toDate?.().getTime() ?? 0;
    return bTime - aTime;
  }).slice(0, 5);
  const upcoming = [...projects].filter((item) => item.status === "active" && item.targetDate >= today).sort((a, b) => a.targetDate.localeCompare(b.targetDate)).slice(0, 4);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-indigo-600">Executive overview</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Current portfolio status from projects you are authorized to view.</p></div><Link href="/dashboard/projects" className="rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-500">View all projects →</Link></header>
          {error && <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
          <section aria-label="Portfolio summary" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Accessible projects", value: projects.length, note: "Based on your permissions", color: "text-slate-900" },
              { label: "Active", value: activeCount, note: "Currently in delivery", color: "text-emerald-700" },
              { label: "Past target date", value: delayedCount, note: "Active projects beyond target", color: delayedCount ? "text-rose-700" : "text-slate-900" },
              { label: "On hold / completed", value: `${onHoldCount} / ${completedCount}`, note: "Paused / delivered", color: "text-indigo-700" },
            ].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{item.label}</p><p className={`mt-4 text-3xl font-semibold tracking-tight ${item.color}`}>{loading ? "—" : item.value}</p><p className="mt-1 text-xs text-slate-400">{item.note}</p></article>)}
          </section>
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold">Recently updated</h2><p className="mt-1 text-xs text-slate-500">Latest project records</p></div><Link href="/dashboard/projects" className="text-xs font-semibold text-indigo-700 hover:text-indigo-500">All projects</Link></div>{loading ? <p className="p-8 text-sm text-slate-500">Loading portfolio…</p> : recent.length === 0 ? <div className="p-8"><p className="font-medium text-slate-700">No projects available yet</p><p className="mt-1 text-sm text-slate-500">Projects appear here once they are created or assigned to you.</p></div> : <div className="divide-y divide-slate-100">{recent.map((item) => <Link key={item.id} href={`/dashboard/projects/${item.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.name}</p><p className="mt-1 truncate text-xs text-slate-500">{item.managerName} · Target {formatDate(item.targetDate)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[item.status] || statusColors.draft}`}>{(item.status || "draft").replaceAll("_", " ")}</span></Link>)}</div>}</section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Upcoming targets</h2><p className="mt-1 text-xs text-slate-500">Nearest active project deadlines</p></div>{loading ? <p className="p-6 text-sm text-slate-500">Loading deadlines…</p> : upcoming.length === 0 ? <p className="p-6 text-sm text-slate-500">No upcoming project targets are recorded.</p> : <ol className="divide-y divide-slate-100">{upcoming.map((item) => <li key={item.id}><Link href={`/dashboard/projects/${item.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-[10px] font-bold uppercase text-indigo-700">{new Date(`${item.targetDate}T00:00:00Z`).toLocaleString(undefined, { month: "short", timeZone: "UTC" })}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{item.name}</span><span className="mt-0.5 block text-xs text-slate-500">{formatDate(item.targetDate)}</span></span><span aria-hidden="true" className="text-slate-300">→</span></Link></li>)}</ol>}</section>
          </div>
      </div>
    </AppShell>
  );
}
