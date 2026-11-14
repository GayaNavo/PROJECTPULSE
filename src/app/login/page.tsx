"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/auth-context";
import { requestPasswordReset, signIn } from "@/features/auth/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const { status, error: sessionError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await signIn(email.trim(), password);
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      setError("Enter your email address first, then request a reset link.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await requestPasswordReset(email.trim());
      setMessage("If an account exists for that email, a password reset link has been sent.");
    } catch {
      setError("Could not send a reset link. Check the email address and Firebase Auth configuration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.28)] sm:p-10">
        <Link className="inline-flex items-center gap-3 text-lg font-bold tracking-tight" href="/">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm text-white">P</span>
          ProjectPulse
        </Link>
        <p className="mt-9 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Workspace access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with the account invited by your ProjectPulse administrator.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSignIn}>
          <label className="block text-sm font-medium text-slate-700">
            Work email
            <input autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {(error || sessionError) && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error || sessionError}</p>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700">{message}</p>}
          <button disabled={busy || status === "loading"} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Please wait…" : "Sign in"}
          </button>
        </form>
        <button type="button" disabled={busy} onClick={handleResetPassword} className="mt-4 text-sm font-semibold text-indigo-700 hover:text-indigo-500 disabled:opacity-60">
          Forgot password?
        </button>
        <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">New accounts are created by an administrator. Public self-registration is disabled.</p>
      </section>
    </main>
  );
}
