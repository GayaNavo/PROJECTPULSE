import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12 sm:px-10">
      <Link className="text-sm font-semibold text-indigo-600" href="/">← ProjectPulse</Link>
      <div className="mt-10">
        <p className="text-sm font-medium text-slate-500">Workspace overview</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your dashboard</h1>
        <p className="mt-3 text-slate-600">Project summaries and team activity will appear here.</p>
      </div>
      <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="font-semibold">Ready for your first project</h2>
        <p className="mt-2 text-sm text-slate-500">Connect Firebase and add your project data to get started.</p>
      </section>
    </main>
  );
}
