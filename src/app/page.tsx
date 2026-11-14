import Link from "next/link";

const highlights = [
  { label: "Projects in motion", value: "12", detail: "Across 4 teams" },
  { label: "Tasks completed", value: "78%", detail: "This quarter" },
  { label: "Items needing attention", value: "3", detail: "Review recommended" },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12 sm:px-10">
      <header className="flex items-center justify-between">
        <Link className="text-lg font-bold tracking-tight" href="/">
          Project<span className="text-indigo-600">Pulse</span>
        </Link>
        <Link
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:border-indigo-300"
          href="/login"
        >
          Sign in
        </Link>
      </header>

      <section className="py-20 sm:py-28">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Clarity for every team
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Keep every project moving forward.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          A shared view of delivery, deadlines, risks, and the decisions that keep
          your organization in sync.
        </p>
        <Link
          className="mt-8 inline-flex rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          href="/dashboard"
        >
          Open dashboard <span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </section>

      <section aria-label="Workspace overview" className="grid gap-4 sm:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{item.value}</p>
            <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
