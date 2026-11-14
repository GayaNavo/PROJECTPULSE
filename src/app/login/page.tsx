import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link className="text-sm font-semibold text-indigo-600" href="/">← ProjectPulse</Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-600">Authentication UI can be added here.</p>
      </section>
    </main>
  );
}
