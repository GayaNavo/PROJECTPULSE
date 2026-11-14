"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/context/auth-context";
import { addProjectComment, createProjectTask, deleteProjectComment, deleteProjectTask, listProjectActivity, listProjectComments, listProjectTasks, updateProjectComment, updateProjectTask } from "../services/tasks";
import { getProject, updateProject } from "../services/projects";
import { ProjectOperations } from "./project-operations";
import { ProjectTeamEditor } from "./project-team-editor";
import type { Project, ProjectPriority, ProjectStatus } from "../types/project";
import type { ChecklistItem, ProjectActivity, ProjectComment, ProjectTask, TaskPriority, TaskStatus } from "../types/task";

const statusLabels: Record<ProjectStatus, string> = { draft: "Draft", active: "Active", on_hold: "On hold", completed: "Completed", archived: "Archived" };
const taskStatusLabels: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", blocked: "Blocked", in_review: "In review", completed: "Completed", cancelled: "Cancelled" };
const taskStatusStyles: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-50 text-sky-700",
  blocked: "bg-rose-50 text-rose-700",
  in_review: "bg-violet-50 text-violet-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function dateLabel(value?: string) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? "Not set" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

function timeLabel(value?: { toDate: () => Date }) {
  if (!value?.toDate) return "Just now";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value.toDate());
}

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { user, profile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [newChecklist, setNewChecklist] = useState<Record<string, string>>({});
  const [taskEditForm, setTaskEditForm] = useState({ title: "", description: "", dueDate: "", priority: "medium" as TaskPriority });
  const [projectForm, setProjectForm] = useState({ name: "", description: "", status: "active" as ProjectStatus, priority: "medium" as ProjectPriority, startDate: "", targetDate: "", forecastDate: "", deadlineChangeReason: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", priority: "medium" as TaskPriority });

  const canManage = Boolean(profile && project && (profile.role === "super_admin" || (profile.role === "project_manager" && project.managerId === profile.uid)));
  const actor = user && profile ? { uid: user.uid, displayName: profile.displayName } : null;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextProject, nextTasks, nextActivity, nextComments] = await Promise.all([
        getProject(projectId),
        listProjectTasks(projectId),
        listProjectActivity(projectId),
        listProjectComments(projectId),
      ]);
      setProject(nextProject);
      setTasks(nextTasks);
      setActivity(nextActivity);
      setComments(nextComments);
      if (nextProject) {
        setProjectForm({
          name: nextProject.name || "",
          description: nextProject.description || "",
          status: nextProject.status || "active",
          priority: nextProject.priority || "medium",
          startDate: nextProject.startDate || "",
          targetDate: nextProject.targetDate || "",
          forecastDate: nextProject.forecastDate || nextProject.targetDate || "",
          deadlineChangeReason: "",
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load this project. Check that you have project access.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProject(projectId),
      listProjectTasks(projectId),
      listProjectActivity(projectId),
      listProjectComments(projectId),
    ])
      .then(([nextProject, nextTasks, nextActivity, nextComments]) => {
        if (!active) return;
        setProject(nextProject);
        setTasks(nextTasks);
        setActivity(nextActivity);
        setComments(nextComments);
        if (nextProject) {
          setProjectForm({
            name: nextProject.name || "",
            description: nextProject.description || "",
            status: nextProject.status || "active",
            priority: nextProject.priority || "medium",
            startDate: nextProject.startDate || "",
            targetDate: nextProject.targetDate || "",
            forecastDate: nextProject.forecastDate || nextProject.targetDate || "",
            deadlineChangeReason: "",
          });
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load this project. Check that you have project access.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [projectId]);

  const today = new Date().toISOString().slice(0, 10);
  const progress = useMemo(() => tasks.length ? Math.round(tasks.reduce((total, task) => total + (task.progress || 0), 0) / tasks.length) : 0, [tasks]);
  const blockedCount = tasks.filter((task) => task.status === "blocked").length;
  const overdueCount = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled" && task.dueDate && task.dueDate < today).length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;

  async function handleSaveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actor) return;
    try {
      await updateProject(projectId, projectForm, actor);
      setEditing(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the project.");
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actor) return;
    setTaskBusy(true);
    setTaskError("");
    try {
      await createProjectTask(projectId, { ...taskForm, assigneeId: actor.uid }, actor);
      setTaskForm({ title: "", description: "", dueDate: "", priority: "medium" });
      setCreatingTask(false);
      await refresh();
    } catch (cause) {
      setTaskError(cause instanceof Error ? cause.message : "Unable to create the task.");
    } finally {
      setTaskBusy(false);
    }
  }

  async function changeTask(task: ProjectTask, patch: Partial<Pick<ProjectTask, "status" | "progress" | "checklist">>) {
    if (!actor) return;
    setTaskError("");
    try {
      await updateProjectTask(projectId, task.id, patch, actor);
      await refresh();
    } catch (cause) {
      setTaskError(cause instanceof Error ? cause.message : "Unable to update task.");
    }
  }

  function startTaskEdit(task: ProjectTask) {
    setEditingTaskId(task.id);
    setTaskEditForm({ title: task.title, description: task.description || "", dueDate: task.dueDate || "", priority: task.priority || "medium" });
  }

  async function saveTaskEdit(event: FormEvent<HTMLFormElement>, task: ProjectTask) {
    event.preventDefault();
    if (!actor) return;
    setTaskBusy(true);
    setTaskError("");
    try {
      await updateProjectTask(projectId, task.id, taskEditForm, actor);
      setEditingTaskId(null);
      await refresh();
    } catch (cause) {
      setTaskError(cause instanceof Error ? cause.message : "Unable to save task changes.");
    } finally {
      setTaskBusy(false);
    }
  }

  async function moveChecklistItem(task: ProjectTask, itemIndex: number, direction: -1 | 1) {
    const checklist = [...(task.checklist || [])];
    const nextIndex = itemIndex + direction;
    if (nextIndex < 0 || nextIndex >= checklist.length) return;
    [checklist[itemIndex], checklist[nextIndex]] = [checklist[nextIndex], checklist[itemIndex]];
    await changeTask(task, { checklist });
  }

  async function renameChecklistItem(task: ProjectTask, itemId: string, currentTitle: string) {
    const title = window.prompt("Checklist item", currentTitle);
    if (title === null || !title.trim()) return;
    const checklist = (task.checklist || []).map((item) => item.id === itemId ? { ...item, title: title.trim() } : item);
    await changeTask(task, { checklist });
  }

  async function removeChecklistItem(task: ProjectTask, itemId: string) {
    const checklist = (task.checklist || []).filter((item) => item.id !== itemId);
    const done = checklist.filter((item) => item.completed).length;
    await changeTask(task, { checklist, progress: checklist.length ? Math.round(done / checklist.length * 100) : 0 });
  }

  async function addChecklistItem(task: ProjectTask) {
    const title = (newChecklist[task.id] || "").trim();
    if (!title) return;
    const item: ChecklistItem = { id: crypto.randomUUID(), title, completed: false };
    await changeTask(task, { checklist: [...(task.checklist || []), item] });
    setNewChecklist((current) => ({ ...current, [task.id]: "" }));
  }

  async function toggleChecklistItem(task: ProjectTask, itemId: string) {
    const checklist = (task.checklist || []).map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item);
    const done = checklist.filter((item) => item.completed).length;
    await changeTask(task, { checklist, progress: checklist.length ? Math.round(done / checklist.length * 100) : task.progress });
  }

  async function handleDeleteTask(task: ProjectTask) {
    if (!actor || !window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    setTaskError("");
    try {
      await deleteProjectTask(projectId, task.id, actor);
      await refresh();
    } catch (cause) {
      setTaskError(cause instanceof Error ? cause.message : "Unable to delete task.");
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actor || !commentText.trim()) return;
    setCommentBusy(true);
    setCommentError("");
    try {
      await addProjectComment(projectId, actor, commentText);
      setCommentText("");
      await refresh();
    } catch (cause) {
      setCommentError(cause instanceof Error ? cause.message : "Unable to post your comment.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function saveCommentEdit(event: FormEvent<HTMLFormElement>, commentId: string) {
    event.preventDefault();
    if (!actor || !editingCommentBody.trim()) return;
    try {
      await updateProjectComment(projectId, commentId, editingCommentBody, actor);
      setEditingCommentId(null);
      setEditingCommentBody("");
      await refresh();
    } catch (cause) {
      setCommentError(cause instanceof Error ? cause.message : "Unable to edit this comment.");
    }
  }

  async function removeComment(commentId: string) {
    if (!actor || !window.confirm("Delete this discussion comment?")) return;
    try {
      await deleteProjectComment(projectId, commentId, actor);
      await refresh();
    } catch (cause) {
      setCommentError(cause instanceof Error ? cause.message : "Unable to delete this comment.");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700">← Projects</Link>
        {loading ? <div className="py-20 text-center text-sm text-slate-500">Loading project workspace…</div> : error ? <div role="alert" className="mt-8 rounded-2xl bg-rose-50 p-5 text-sm text-rose-700">{error}</div> : !project ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Project not found or you do not have access.</div> : (
          <>
            <header className="mt-5 flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">{statusLabels[project.status] || "Active"}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{project.priority} priority</span>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{project.name}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{project.description || "No project description yet."}</p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                  <span>Manager <strong className="font-semibold text-slate-700">{project.managerName}</strong></span>
                  <span>Start <strong className="font-semibold text-slate-700">{dateLabel(project.startDate)}</strong></span>
                  <span>Original target <strong className="font-semibold text-slate-700">{dateLabel(project.targetDate)}</strong></span>
                  <span>Forecast <strong className="font-semibold text-slate-700">{dateLabel(project.forecastDate)}</strong></span>
                </div>
              </div>
              {canManage && <button onClick={() => setEditing((current) => !current)} className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">{editing ? "Close editor" : "Edit project"}</button>}
            </header>

            {editing && canManage && <form onSubmit={handleSaveProject} className="mt-5 grid gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 md:grid-cols-2">
              <label className="text-sm font-medium">Project name<input required value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
              <label className="text-sm font-medium">Description<input value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
              <label className="text-sm font-medium">Status<select value={projectForm.status} onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value as ProjectStatus })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2">{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className="text-sm font-medium">Priority<select value={projectForm.priority} onChange={(event) => setProjectForm({ ...projectForm, priority: event.target.value as ProjectPriority })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
              <label className="text-sm font-medium">Start date<input type="date" value={projectForm.startDate} onChange={(event) => setProjectForm({ ...projectForm, startDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
              <label className="text-sm font-medium">Original target date<input type="date" readOnly value={projectForm.targetDate} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" /></label>
              <label className="text-sm font-medium">Forecast completion date<input type="date" value={projectForm.forecastDate} onChange={(event) => setProjectForm({ ...projectForm, forecastDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
              <label className="text-sm font-medium md:col-span-2">Reason for forecast change (required when changing the forecast)<input value={projectForm.deadlineChangeReason} onChange={(event) => setProjectForm({ ...projectForm, deadlineChangeReason: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" placeholder="Explain the schedule change" /></label>
              {profile?.role === "super_admin" && <ProjectTeamEditor projectId={projectId} managerId={project.managerId} memberIds={project.memberIds || []} onSaved={refresh} />}
              <div className="flex items-end justify-end"><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Save project details</button></div>
            </form>}

            <section aria-label="Project metrics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Overall task progress", value: `${progress}%`, detail: `${completedCount} of ${tasks.length} tasks complete`, color: "text-indigo-700" },
                { label: "Open tasks", value: tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length, detail: "Across this project", color: "text-slate-900" },
                { label: "Blocked", value: blockedCount, detail: "Tasks needing attention", color: blockedCount ? "text-rose-700" : "text-slate-900" },
                { label: "Overdue", value: overdueCount, detail: "Past due and not complete", color: overdueCount ? "text-amber-700" : "text-slate-900" },
              ].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p><p className={`mt-3 text-2xl font-semibold ${item.color}`}>{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></article>)}
            </section>

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,.85fr)]">
              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div><h2 className="font-semibold">Tasks and checklists</h2><p className="mt-1 text-xs text-slate-500">Manage work and progress in this project.</p></div>
                  {canManage && <button onClick={() => setCreatingTask((current) => !current)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{creatingTask ? "Cancel" : "+ Add task"}</button>}
                </div>
                {taskError && <p role="alert" className="mx-5 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{taskError}</p>}
                {creatingTask && <form onSubmit={handleCreateTask} className="m-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Task title<input required maxLength={160} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" placeholder="Describe the next piece of work" /></label>
                  <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description<input value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="text-xs font-semibold text-slate-600">Due date<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="text-xs font-semibold text-slate-600">Priority<select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                  <div className="flex justify-end sm:col-span-2"><button disabled={taskBusy} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{taskBusy ? "Saving…" : "Save task"}</button></div>
                </form>}
                {tasks.length === 0 && !creatingTask ? <div className="px-6 py-12 text-center"><p className="font-medium text-slate-700">No tasks yet</p><p className="mt-1 text-sm text-slate-500">Add tasks to make progress visible.</p>{canManage && <button onClick={() => setCreatingTask(true)} className="mt-4 text-sm font-semibold text-indigo-700">Add the first task →</button>}</div> : <div className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const checklist = task.checklist || [];
                    const isTaskOwner = task.assigneeId === user?.uid;
                    const canUpdate = canManage || isTaskOwner;
                    const doneItems = checklist.filter((item) => item.completed).length;
                    return <article key={task.id} className="px-5 py-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{task.title}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${taskStatusStyles[task.status]}`}>{taskStatusLabels[task.status]}</span><span className="text-[11px] font-semibold uppercase text-slate-400">{task.priority}</span></div>
                          {task.description && <p className="mt-1.5 text-sm leading-5 text-slate-500">{task.description}</p>}
                          <p className="mt-2 text-xs text-slate-400">{task.assigneeId === user?.uid ? "Assigned to you" : task.assigneeId ? "Assigned to a project member" : "Unassigned"} · Due {dateLabel(task.dueDate)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <label className="sr-only" htmlFor={`status-${task.id}`}>Update status for {task.title}</label>
                          <select id={`status-${task.id}`} disabled={!canUpdate} value={task.status} onChange={(event) => void changeTask(task, { status: event.target.value as TaskStatus })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium disabled:opacity-60">{Object.entries(taskStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                          {canManage && <button onClick={() => editingTaskId === task.id ? setEditingTaskId(null) : startTaskEdit(task)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-700">{editingTaskId === task.id ? "Close" : "Edit"}</button>}
                          {canManage && <button onClick={() => void handleDeleteTask(task)} aria-label={`Delete ${task.title}`} className="rounded-lg px-2 py-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">×</button>}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }} /></div><span className="w-9 text-right text-xs font-semibold text-slate-500">{task.progress || 0}%</span></div>
                      {editingTaskId === task.id && canManage && <form onSubmit={(event) => void saveTaskEdit(event, task)} className="mt-4 grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Task title<input required maxLength={160} value={taskEditForm.title} onChange={(event) => setTaskEditForm({ ...taskEditForm, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label>
                        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description<textarea rows={2} value={taskEditForm.description} onChange={(event) => setTaskEditForm({ ...taskEditForm, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label>
                        <label className="text-xs font-semibold text-slate-600">Due date<input type="date" value={taskEditForm.dueDate} onChange={(event) => setTaskEditForm({ ...taskEditForm, dueDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label>
                        <label className="text-xs font-semibold text-slate-600">Priority<select value={taskEditForm.priority} onChange={(event) => setTaskEditForm({ ...taskEditForm, priority: event.target.value as TaskPriority })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                        <div className="flex justify-end sm:col-span-2"><button disabled={taskBusy} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60">{taskBusy ? "Saving…" : "Save task"}</button></div>
                      </form>}
                      <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                        <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-600">Checklist <span className="font-normal text-slate-400">{doneItems}/{checklist.length} complete</span></p></div>
                        {checklist.length > 0 && <ul className="mt-2 space-y-2">{checklist.map((item, index) => <li key={item.id} className="flex items-start gap-2 text-sm"><input type="checkbox" aria-label={`Mark ${item.title} ${item.completed ? "incomplete" : "complete"}`} disabled={!canUpdate} checked={item.completed} onChange={() => void toggleChecklistItem(task, item.id)} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><span className={`min-w-0 flex-1 ${item.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.title}</span>{canUpdate && <span className="flex shrink-0 gap-1"><button type="button" title="Move checklist item up" disabled={index === 0} onClick={() => void moveChecklistItem(task, index, -1)} className="px-1 text-slate-400 hover:text-indigo-700 disabled:opacity-30">↑</button><button type="button" title="Move checklist item down" disabled={index === checklist.length - 1} onClick={() => void moveChecklistItem(task, index, 1)} className="px-1 text-slate-400 hover:text-indigo-700 disabled:opacity-30">↓</button><button type="button" title="Edit checklist item" onClick={() => void renameChecklistItem(task, item.id, item.title)} className="px-1 text-slate-400 hover:text-indigo-700">Edit</button><button type="button" title="Delete checklist item" onClick={() => void removeChecklistItem(task, item.id)} className="px-1 text-slate-400 hover:text-rose-600">×</button></span>}</li>)}</ul>}
                        {canUpdate && <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void addChecklistItem(task); }}><input aria-label={`New checklist item for ${task.title}`} value={newChecklist[task.id] || ""} onChange={(event) => setNewChecklist((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Add checklist item" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500" /><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-700">Add</button></form>}
                      </div>
                    </article>;
                  })}
                </div>}
              </section>

              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Project discussion</h2><p className="mt-1 text-xs text-slate-500">Questions, decisions, and updates for this project.</p></div>
                  {commentError && <p role="alert" className="mx-4 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{commentError}</p>}
                  <form onSubmit={handleComment} className="border-b border-slate-100 p-4"><label className="sr-only" htmlFor="project-comment">Add a project comment</label><textarea id="project-comment" required maxLength={5000} rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Share an update or ask a question…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" /><div className="mt-2 flex justify-end"><button disabled={commentBusy || !commentText.trim()} className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">{commentBusy ? "Posting…" : "Post comment"}</button></div></form>
                  <div className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
                    {comments.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">No discussion yet. Start the conversation.</p> : comments.map((comment) => {
                      const canEditComment = comment.authorId === user?.uid || canManage;
                      return <article key={comment.id} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-800">{comment.authorName}</p><time className="shrink-0 text-[11px] text-slate-400">{timeLabel(comment.createdAt)}</time></div>
                        {editingCommentId === comment.id ? <form onSubmit={(event) => void saveCommentEdit(event, comment.id)} className="mt-2"><textarea required maxLength={5000} rows={3} value={editingCommentBody} onChange={(event) => setEditingCommentBody(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingCommentId(null)} className="text-xs font-semibold text-slate-500">Cancel</button><button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button></div></form> : <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.body}</p>}
                        {canEditComment && editingCommentId !== comment.id && <div className="mt-2 flex gap-3"><button onClick={() => { setEditingCommentId(comment.id); setEditingCommentBody(comment.body); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Edit</button><button onClick={() => void removeComment(comment.id)} className="text-xs font-semibold text-slate-400 hover:text-rose-600">Delete</button></div>}
                      </article>;
                    })}
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Recent activity</h2><p className="mt-1 text-xs text-slate-500">Important project changes</p></div>
                  {activity.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">Project activity will appear here.</p> : <ol className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">{activity.map((item) => <li key={item.id} className="flex gap-3 px-5 py-3.5"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" /><div className="min-w-0"><p className="text-sm text-slate-700"><span className="font-semibold">{item.actorName}</span> {item.message}</p><time className="mt-1 block text-[11px] text-slate-400">{timeLabel(item.createdAt)}</time></div></li>)}</ol>}
                </section>
              </div>
            </div>
            <section aria-label="Milestones, blockers, and business support" className="mt-6 space-y-6">
              <ProjectOperations projectId={projectId} tasks={tasks} actor={actor} canManage={canManage} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
