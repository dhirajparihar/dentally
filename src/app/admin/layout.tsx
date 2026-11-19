"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Building2,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSuperAdmin =
    (session?.user as any)?.role === "superadmin" ||
    Boolean((session?.user as any)?.isSuperAdmin);

  if (status === "loading") {
    return (
      <div className="dashboard-shell min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-[#52627A]">
          <div className="w-8 h-8 border-2 border-[#0089A8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || (!isSuperAdmin && process.env.NODE_ENV !== "development")) {
    return (
      <div className="dashboard-shell min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E4E9F0] text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#111C3A]">Superadmin Access Required</h2>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Your account ({session?.user?.email || "Guest"}) does not have platform operator privileges. Only accounts listed in <code className="font-mono text-[#0089A8]">ADMIN_EMAILS</code> can access this console.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Return to Clinic Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2.5 rounded-xl bg-[#FAFBFC] hover:bg-[#EDF7FA] border border-[#E4E9F0] text-[#111C3A] text-xs font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || "Platform Admin";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dashboard-shell min-h-screen bg-[#FAFBFC] flex flex-col lg:flex-row">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-[#111C3A]/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* ================= ADMIN SIDEBAR ================= */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 max-w-[85vw] bg-white text-[#52627A] border-r border-[#E4E9F0] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-[#E4E9F0] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src="/logo.png"
                alt="Dentally Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline">
                <span className="font-bold text-xl tracking-tight text-[#111C3A] font-sans">
                  Dentally
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0089A8] ml-1" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00738E]">
                Platform Admin
              </span>
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-[#00738E] hover:bg-[#EDF7FA]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="px-3 py-6 flex-1 space-y-1 overflow-y-auto">
          <span className="px-3 text-[10px] uppercase tracking-[0.15em] text-[#8291A7] font-semibold block mb-2 font-mono">
            Platform Management
          </span>

          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-[#EDF7FA] text-[#00738E] transition-all"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-[#0089A8]" />
              <span>Clinics & Analytics</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold bg-[#E6F6F3] text-[#167D69]">
              Live
            </span>
          </Link>
        </div>

        {/* Admin Profile Footer */}
        <div className="p-4 border-t border-[#E4E9F0] bg-[#FAFBFC]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName}
                  className="w-8 h-8 rounded-full border border-[#BEE3E9] object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#111C3A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
              )}
              <div className="overflow-hidden min-w-0">
                <div className="flex items-center gap-1">
                  <h5 className="text-xs font-bold text-[#111C3A] truncate">
                    {userName}
                  </h5>
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[10px] text-[#64748B] font-mono truncate">
                  {userEmail}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-[#EDF7FA] transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Sticky Header matching Header.tsx */}
        <header className="sticky top-0 z-30 bg-[#FAFBFC]/95 backdrop-blur-md border-b border-[#E4E9F0] px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Mobile Menu & Title */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation"
                className="lg:hidden p-2 rounded-xl text-[#52627A] hover:bg-[#EDF7FA]"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate font-bold text-base sm:text-xl text-[#111C3A] tracking-tight font-sans">
                    Platform Operations Center
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF7FA] text-[#00738E] border border-[#CDEBF2] font-mono">
                    Superadmin
                  </span>
                </div>
                <p className="text-[11px] text-[#52627A] font-medium hidden sm:block">
                  Multi-tenant clinic directory, telemetric pulse, and platform management
                </p>
              </div>
            </div>

            {/* Right Quick Actions */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Telemetry Indicator */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EDF7FA] border border-[#D4EDF3] text-[#111C3A] text-xs font-mono font-medium"
                title="MongoDB connection & Multi-tenant isolation active"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span>MongoDB Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-4 sm:p-7 xl:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
