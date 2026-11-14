"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/context/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { createProject, listProjects, type NewProject } from "../services/projects";
import type { Project, ProjectPriority, ProjectStatus } from "../types/project";

const statusLabels: Record<ProjectStatus, string> = {
  draft: "Draft",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

const statusStyles: Record<ProjectStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-amber-50 text-amber-700",
  completed: "bg-indigo-50 text-indigo-700",
  archived: "bg-slate-100 text-slate-500",
};

const priorityStyles: Record<ProjectPriority, string> = {
  low: "text-slate-500",
  medium: "text-sky-700",
  high: "text-amber-700",
  urgent: "text-rose-700",
};

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function ProjectDashboard() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("deadline");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState<NewProject>({
    name: "",
    description: "",
    priority: "medium",
    startDate: new Date().toISOString().slice(0, 10),
    targetDate: "",
  });

  const canCreate = profile?.role === "super_admin" || profile?.role === "project_manager";

  const refresh = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);
    setLoadError("");
    try {
      setProjects(await listProjects(user.uid, profile.role));
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Unable to load your projects.");
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user || !profile) return;
    let active = true;
    listProjects(user.uid, profile.role)
      .then((result) => {
        if (active) setProjects(result);
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : "Unable to load your projects.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user, profile]);

  const filteredProjects = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const priorityRank: Record<ProjectPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...projects]
      .filter((project) => statusFilter === "all" || project.status === statusFilter)
      .filter((project) => priorityFilter === "all" || project.priority === priorityFilter)
      .filter((project) => managerFilter === "all" || project.managerId === managerFilter)
      .filter((project) => !fromDate || project.targetDate >= fromDate)
      .filter((project) => !toDate || project.targetDate <= toDate)
      .filter((project) => !normalized || `${project.name} ${project.description} ${project.managerName}`.toLowerCase().includes(normalized))
      .sort((a, b) => sortBy === "name"
        ? a.name.localeCompare(b.name)
        : sortBy === "priority"
          ? priorityRank[a.priority] - priorityRank[b.priority]
          : (a.targetDate || "9999").localeCompare(b.targetDate || "9999"));
  }, [projects, search, statusFilter, priorityFilter, managerFilter, fromDate, toDate, sortBy]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const visibleProjects = filteredProjects.slice((page - 1) * pageSize, page * pageSize);
  const managers = [...new Map(projects.map((project) => [project.managerId, project.managerName])).entries()];

  const today = new Date().toISOString().slice(0, 10);
  const activeCount = projects.filter((project) => project.status === "active").length;
  const onHoldCount = projects.filter((project) => project.status === "on_hold").length;
  const completedCount = projects.filter((project) => project.status === "completed").length;
  const overdueCount = projects.filter((project) => project.status === "active" && project.targetDate && project.targetDate < today).length;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    setSaveError("");
    try {
      await createProject(form, { uid: user.uid, displayName: profile.displayName });
      setShowCreate(false);
      setForm({ name: "", description: "", priority: "medium", startDate: today, targetDate: "" });
      await refresh();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Unable to create the project. Check your access and try again.");
    } finally {
      setSaving(false);
    }
  }

  function exportProjects() {
    const columns = ["Project", "Manager", "Status", "Priority", "Start date", "Original target", "Forecast"];
    const rows = filteredProjects.map((project) => [project.name, project.managerName, project.status, project.priority, project.startDate, project.targetDate, project.forecastDate]);
    const escapeCell = (value: string) => `"${(value || "").replaceAll('"', '""')}"`;
    const csv = [columns, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `projectpulse-projects-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Company overview</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
            <p className="mt-2 text-sm text-slate-500">A live view of delivery across the projects you can access.</p>
          </div>
          {canCreate && <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"><span className="text-lg leading-none">+</span> Create project</button>}
        </header>

        <section aria-label="Project summary" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active projects", value: activeCount, note: "Currently in delivery", accent: "text-emerald-700" },
            { label: "Past target date", value: overdueCount, note: "Active projects past target", accent: overdueCount ? "text-rose-700" : "text-slate-900" },
            { label: "On hold", value: onHoldCount, note: "Temporarily paused", accent: "text-amber-700" },
            { label: "Completed", value: completedCount, note: `${projects.length} total accessible`, accent: "text-indigo-700" },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className={`mt-4 text-3xl font-semibold tracking-tight ${item.accent}`}>{item.value}</p>
              <p className="mt-1 text-xs text-slate-400">{item.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">Project portfolio</h2>
              <p className="mt-1 text-xs text-slate-500">{projects.length} project{projects.length === 1 ? "" : "s"} available to your account</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <label className="sr-only" htmlFor="project-search">Search projects</label>
              <input id="project-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search projects…" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              <label className="sr-only" htmlFor="project-status">Filter by status</label>
              <select id="project-status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <label className="sr-only" htmlFor="project-priority">Filter by priority</label>
              <select id="project-priority" value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
              <label className="sr-only" htmlFor="project-manager">Filter by manager</label>
              <select id="project-manager" value={managerFilter} onChange={(event) => { setManagerFilter(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"><option value="all">All managers</option>{managers.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}</select>
              <label className="sr-only" htmlFor="target-from">Target date from</label>
              <input id="target-from" type="date" aria-label="Target date from" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              <label className="sr-only" htmlFor="target-to">Target date to</label>
              <input id="target-to" type="date" aria-label="Target date to" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              <label className="sr-only" htmlFor="project-sort">Sort projects</label>
              <select id="project-sort" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"><option value="deadline">Sort: deadline</option><option value="name">Sort: name</option><option value="priority">Sort: priority</option></select>
              <button onClick={exportProjects} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700">Export CSV</button>
            </div>
          </div>

          {loadError && <p role="alert" className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{loadError}</p>}
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading projects…</div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-xl text-indigo-600">↗</div>
              <h3 className="mt-4 font-semibold text-slate-900">{projects.length ? "No matching projects" : "Your project space is ready"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{projects.length ? "Try a different search or status filter." : canCreate ? "Create the first project to start tracking work, deadlines, and team progress." : "You have not been assigned to a project yet. Ask a project manager for access."}</p>
              {!projects.length && canCreate && <button onClick={() => setShowCreate(true)} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">Create your first project</button>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleProjects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="group grid gap-4 px-5 py-5 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1.5fr)_minmax(100px,.7fr)_minmax(120px,.8fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">{project.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[project.status]}`}>{statusLabels[project.status]}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">{project.description || "No description provided"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project manager</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-700">{project.managerName || "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Target date</p>
                    <p className={`mt-1 text-sm font-medium ${project.status === "active" && project.targetDate < today ? "text-rose-700" : "text-slate-700"}`}>{formatDate(project.targetDate)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className={`text-xs font-semibold uppercase ${priorityStyles[project.priority]}`}>{project.priority} priority</span>
                    <span aria-hidden="true" className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {!loading && filteredProjects.length > pageSize && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-xs text-slate-500">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredProjects.length)} of {filteredProjects.length}</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Previous</button><span className="px-2 py-1.5 text-xs text-slate-500">Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Next</button></div></div>}
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <section aria-labelledby="create-project-title" aria-modal="true" role="dialog" className="my-6 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">New workspace</p><h2 id="create-project-title" className="mt-1 text-xl font-semibold">Create a project</h2></div>
              <button onClick={() => setShowCreate(false)} aria-label="Close dialog" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">Project name<input autoFocus required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500" placeholder="e.g. Customer portal launch" /></label>
              <label className="block text-sm font-medium">Description<textarea rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500" placeholder="What is this project aiming to deliver?" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Start date<input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500" /></label>
                <label className="block text-sm font-medium">Target deadline<input type="date" required min={form.startDate} value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500" /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ProjectPriority })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-indigo-500"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                <p className="self-end pb-3 text-xs leading-5 text-slate-500">You will be assigned as the project manager. Invite/team assignments can be added in the next stage.</p>
              </div>
              {saveError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{saveError}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{saving ? "Creating…" : "Create project"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}
