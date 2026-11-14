"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createWorkspaceRecord, deleteWorkspaceRecord, listWorkspaceRecords, updateWorkspaceRecord } from "../services/workspace-records";
import type { ProjectTask } from "../types/task";
import type { BlockerSeverity, BlockerStatus, MilestoneStatus, SupportPriority, SupportStatus, WorkspaceCollection, WorkspaceRecord } from "../types/workspace-records";

interface MilestoneRecord extends WorkspaceRecord { title: string; dueDate: string; notes: string; status: MilestoneStatus }
interface BlockerRecord extends WorkspaceRecord { title: string; description: string; severity: BlockerSeverity; dueDate: string; nextAction: string; status: BlockerStatus }
interface SupportRecord extends WorkspaceRecord { description: string; taskId: string; department: string; category: string; requiredBy: string; priority: SupportPriority; resolutionNotes: string; status: SupportStatus }

type Section = WorkspaceCollection;
type Actor = { uid: string; displayName: string };

const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "No date";

export function ProjectOperations({
  projectId,
  tasks,
  actor,
  canManage,
}: {
  projectId: string;
  tasks: ProjectTask[];
  actor: Actor | null;
  canManage: boolean;
}) {
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [blockers, setBlockers] = useState<BlockerRecord[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRecord[]>([]);
  const [formSection, setFormSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", severity: "medium" as BlockerSeverity, nextAction: "", taskId: "", department: "Operations", category: "Business requirements", priority: "medium" as SupportPriority, notes: "" });

  const refresh = useCallback(async () => {
    const [nextMilestones, nextBlockers, nextSupport] = await Promise.all([
      listWorkspaceRecords<MilestoneRecord>(projectId, "milestones"),
      listWorkspaceRecords<BlockerRecord>(projectId, "blockers"),
      listWorkspaceRecords<SupportRecord>(projectId, "supportRequests"),
    ]);
    setMilestones(nextMilestones);
    setBlockers(nextBlockers);
    setSupportRequests(nextSupport);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listWorkspaceRecords<MilestoneRecord>(projectId, "milestones"),
      listWorkspaceRecords<BlockerRecord>(projectId, "blockers"),
      listWorkspaceRecords<SupportRecord>(projectId, "supportRequests"),
    ])
      .then(([nextMilestones, nextBlockers, nextSupport]) => {
        if (!active) return;
        setMilestones(nextMilestones);
        setBlockers(nextBlockers);
        setSupportRequests(nextSupport);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load project milestones and requests.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  function openForm(section: Section) {
    setFormSection(section);
    setError("");
    setForm({ title: "", description: "", dueDate: "", severity: "medium", nextAction: "", taskId: "", department: "Operations", category: "Business requirements", priority: "medium", notes: "" });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actor || !formSection) return;
    setBusy(true);
    setError("");
    let input: Record<string, unknown>;
    if (formSection === "milestones") {
      input = { title: form.title.trim(), dueDate: form.dueDate, notes: form.notes.trim(), status: "upcoming" satisfies MilestoneStatus };
    } else if (formSection === "blockers") {
      input = { title: form.title.trim(), description: form.description.trim(), severity: form.severity, dueDate: form.dueDate, nextAction: form.nextAction.trim(), status: "open" satisfies BlockerStatus };
    } else {
      input = { description: form.description.trim(), taskId: form.taskId, department: form.department, category: form.category, requiredBy: form.dueDate, priority: form.priority, status: "pending" satisfies SupportStatus, resolutionNotes: "" };
    }
    try {
      await createWorkspaceRecord(projectId, formSection, input, actor);
      setFormSection(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this record.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(section: Section, item: WorkspaceRecord, status: string) {
    if (!actor) return;
    setError("");
    try {
      await updateWorkspaceRecord(projectId, section, item.id, { status }, actor);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update status.");
    }
  }

  async function removeRecord(section: Section, item: WorkspaceRecord) {
    if (!actor || !canManage || !window.confirm("Remove this record? This cannot be undone.")) return;
    setError("");
    try {
      await deleteWorkspaceRecord(projectId, section, item.id, actor);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove this record.");
    }
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading milestones, blockers, and support requests…</div> : <>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Milestones" description="Key delivery checkpoints and dates." button="Add milestone" onAdd={() => openForm("milestones")} />
          {milestones.length === 0 ? <EmptyLine>Milestones will appear here as they are added.</EmptyLine> : <div className="divide-y divide-slate-100">{milestones.map((item) => <RecordRow key={item.id} title={item.title} detail={`${dateLabel(item.dueDate)}${item.notes ? ` · ${item.notes}` : ""}`} badge={item.status.replaceAll("_", " ")} owner={item.ownerName} canManage={canManage} onDelete={() => void removeRecord("milestones", item)}><select aria-label={`Update milestone ${item.title}`} disabled={!canManage && item.ownerId !== actor?.uid} value={item.status} onChange={(event) => void changeStatus("milestones", item, event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="upcoming">Upcoming</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option></select></RecordRow>)}</div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Blockers and risks" description="Issues that may affect delivery, with owners and next actions." button="Add blocker" onAdd={() => openForm("blockers")} />
          {blockers.length === 0 ? <EmptyLine>No active blockers or risks recorded.</EmptyLine> : <div className="divide-y divide-slate-100">{blockers.map((item) => <RecordRow key={item.id} title={item.title} detail={`${item.description || "No details"}${item.nextAction ? ` · Next: ${item.nextAction}` : ""}`} badge={`${item.severity} · ${item.status.replaceAll("_", " ")}`} owner={`${item.ownerName}${item.dueDate ? ` · ${dateLabel(item.dueDate)}` : ""}`} canManage={canManage} onDelete={() => void removeRecord("blockers", item)}><select aria-label={`Update blocker ${item.title}`} disabled={!canManage && item.ownerId !== actor?.uid} value={item.status} onChange={(event) => void changeStatus("blockers", item, event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></RecordRow>)}</div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Business-side support" description="Requests that need help from business stakeholders." button="Request support" onAdd={() => openForm("supportRequests")} />
          {supportRequests.length === 0 ? <EmptyLine>No business support requests yet.</EmptyLine> : <div className="divide-y divide-slate-100">{supportRequests.map((item) => <RecordRow key={item.id} title={item.description} detail={`${item.department} · ${item.category}${item.taskId ? ` · Task: ${tasks.find((task) => task.id === item.taskId)?.title || "Linked task"}` : ""}`} badge={`${item.priority} · ${item.status.replaceAll("_", " ")}`} owner={`${item.ownerName}${item.requiredBy ? ` · Required by ${dateLabel(item.requiredBy)}` : ""}`} canManage={canManage} onDelete={() => void removeRecord("supportRequests", item)}><select aria-label="Update support request status" disabled={!canManage && item.ownerId !== actor?.uid} value={item.status} onChange={(event) => void changeStatus("supportRequests", item, event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="fulfilled">Fulfilled</option><option value="rejected">Rejected</option></select></RecordRow>)}</div>}
        </section>
      </>}

      {formSection && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormSection(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="record-form-title" className="my-5 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Project workspace</p><h2 id="record-form-title" className="mt-1 text-xl font-semibold">{formSection === "milestones" ? "Add milestone" : formSection === "blockers" ? "Log blocker or risk" : "Request business support"}</h2></div><button type="button" aria-label="Close dialog" onClick={() => setFormSection(null)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">×</button></div>
          <form onSubmit={submitForm} className="mt-5 space-y-4">
            {formSection === "milestones" ? <>
              <Field label="Milestone title"><input required maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input" placeholder="e.g. UAT sign-off" /></Field>
              <Field label="Due date"><input type="date" required value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="input" /></Field>
              <Field label="Notes"><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input" /></Field>
            </> : formSection === "blockers" ? <>
              <Field label="Blocker or risk"><input required maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input" placeholder="What could affect delivery?" /></Field>
              <Field label="Details"><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Severity"><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as BlockerSeverity })} className="input"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field><Field label="Review date"><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="input" /></Field></div>
              <Field label="Next action"><input value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} className="input" /></Field>
            </> : <>
              <Field label="Support needed"><textarea required rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input" placeholder="Describe the help or decision needed" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Department"><select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="input">{["Finance", "Sales", "Marketing", "Operations", "Human Resources", "Management", "Legal", "Other"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Category"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="input">{["Business requirements", "Content or documents", "Credentials or access", "Client coordination", "Business decisions", "Budget or resources", "Approval or sign-off", "Other"].map((item) => <option key={item}>{item}</option>)}</select></Field></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Required by"><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="input" /></Field><Field label="Priority"><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as SupportPriority })} className="input"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field></div>
              {tasks.length > 0 && <Field label="Related task (optional)"><select value={form.taskId} onChange={(event) => setForm({ ...form, taskId: event.target.value })} className="input"><option value="">Project-level request</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>}
            </>}
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setFormSection(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save"}</button></div>
          </form>
        </section>
      </div>}

      <style jsx>{`.input { width: 100%; margin-top: .375rem; border: 1px solid #e2e8f0; border-radius: .5rem; background: white; padding: .625rem .75rem; font-size: .875rem; outline: none; } .input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px #e0e7ff; }`}</style>
    </div>
  );
}

function SectionHeader({ title, description, button, onAdd }: { title: string; description: string; button: string; onAdd: () => void }) {
  return <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div><button onClick={onAdd} className="self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">+ {button}</button></div>;
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm text-slate-400">{children}</p>;
}

function RecordRow({ title, detail, badge, owner, canManage, onDelete, children }: { title: string; detail: string; badge: string; owner: string; canManage: boolean; onDelete: () => void; children: ReactNode }) {
  return <article className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-slate-800">{title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{badge}</span></div><p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p><p className="mt-1 text-xs text-slate-400">Owner: {owner}</p></div><div className="flex shrink-0 items-center gap-2">{children}{canManage && <button onClick={onDelete} aria-label={`Remove ${title}`} className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">×</button>}</div></article>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}
