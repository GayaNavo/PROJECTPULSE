"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { signOutUser } from "@/features/auth/services/auth";
import { useAuth } from "@/features/auth/context/auth-context";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/dashboard/projects", label: "Projects", icon: "▤" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const navItems = profile?.role === "super_admin"
    ? [...navigation, { href: "/dashboard/users", label: "User management", icon: "♙" }]
    : navigation;

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status !== "authenticated" || !user || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
          Checking your workspace access…
        </div>
      </main>
    );
  }

  async function handleSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-4">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 text-lg font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm text-white">P</span>
          ProjectPulse
        </Link>
        <p className="mb-3 mt-9 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        <nav className="flex gap-2 lg:flex-col">
          {navItems.map((item) => {
            const active = item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <span aria-hidden="true" className="w-5 text-center">{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 hidden rounded-2xl bg-slate-50 p-4 lg:block">
          <p className="text-xs font-semibold text-slate-500">Signed in as</p>
          <p className="mt-2 truncate text-sm font-semibold">{profile.displayName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{profile.email}</p>
          <p className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600 ring-1 ring-slate-200">
            {profile.role.replaceAll("_", " ")}
          </p>
          <button onClick={handleSignOut} className="mt-4 block text-sm font-medium text-slate-500 hover:text-rose-600">
            Sign out
          </button>
        </div>
        <button onClick={handleSignOut} className="ml-auto mt-3 block text-sm font-medium text-slate-500 hover:text-rose-600 lg:hidden">
          Sign out
        </button>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}
