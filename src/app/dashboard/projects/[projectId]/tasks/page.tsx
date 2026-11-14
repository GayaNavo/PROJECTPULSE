import Link from "next/link";

type ProjectTasksPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTasksPage({ params }: ProjectTasksPageProps) {
  const { projectId } = await params;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
      <Link className="text-sm font-semibold text-indigo-600" href="/dashboard">← Dashboard</Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Project tasks</h1>
      <p className="mt-3 text-slate-600">Task list for project {projectId}.</p>
    </main>
  );
}
