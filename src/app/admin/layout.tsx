"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShieldCheck, LogOut, ArrowLeft, Activity, Stethoscope } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  const isSuperAdmin =
    (session?.user as any)?.role === "superadmin" ||
    Boolean((session?.user as any)?.isSuperAdmin);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || (!isSuperAdmin && process.env.NODE_ENV !== "development")) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1E293B] rounded-3xl p-8 border border-slate-700 text-center space-y-4 text-white">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Superadmin Access Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your account ({session?.user?.email || "Guest"}) does not have platform operator privileges. Only emails listed in ADMIN_EMAILS can access this console.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-900 font-semibold text-xs transition-colors"
            >
              Return to Clinic Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userImage = session?.user?.image;
  const userName = session?.user?.name || "Platform Admin";
  const userEmail = session?.user?.email || "";

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans">
      {/* Top Operations Header */}
      <header className="sticky top-0 z-40 bg-[#0B132B]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Dentally</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider">
                  Admin Console
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Multi-Clinic Platform & Telemetry
              </p>
            </div>
          </div>

          {/* Action Links & Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Direct Switch to Clinic Operatory */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-2xs"
              title="Open your personal clinic operatory screen"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Chairside Operatory</span>
              <span className="sm:hidden">Operatory</span>
            </Link>

            {/* Admin Badge & Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName}
                  className="w-8 h-8 rounded-full border border-teal-500/40 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-teal-400">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{userName}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{userEmail}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Sign out of admin console"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

