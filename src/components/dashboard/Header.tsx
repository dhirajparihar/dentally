"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Calendar, LogOut, ShieldCheck } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useClinic } from "@/context/ClinicContext";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onBookAppointment?: () => void;
  title?: string;
}

const bookingButtonClass = "px-3.5 sm:px-4 py-2 rounded-full bg-[#0089A8] text-white text-xs sm:text-sm font-semibold hover:bg-[#00738E] transition-all flex items-center gap-1.5 shadow-xs";
const bookingButtonLabel = (
  <>
    <Calendar className="w-4 h-4" aria-hidden="true" />
    <span className="hidden sm:inline">Book Appointment</span>
    <span className="sm:hidden">Book</span>
  </>
);

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onBookAppointment, title }) => {
  const pathname = usePathname();
  const sectionTitles: Record<string, string> = {
    patients: "Patients",
    appointments: "Appointments",
    fees: "Fees & Collections",
    mcp: "ChatGPT MCP Hub",
    settings: "Clinic Settings",
  };
  const pageTitle = title ?? sectionTitles[pathname.split("/")[2]] ?? "Dashboard";
  const { isSyncing, clinicProfile, loading } = useClinic();
  const { data: session, status } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const userName = status === "loading" ? "Doctor" : (clinicProfile.dentistName || session?.user?.name || "Doctor");
  const userEmail = status === "loading" ? "" : (clinicProfile.email || session?.user?.email || "");
  const userImage = session?.user?.image;
  const isSuperAdmin =
    (session?.user as any)?.role === "superadmin" ||
    Boolean((session?.user as any)?.isSuperAdmin);
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[#FAFBFC]/95 backdrop-blur-md border-b border-[#E4E9F0] px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu + Title */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation"
            className="lg:hidden p-2 rounded-xl text-[#52627A] hover:bg-[#EDF7FA]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="min-w-0 truncate font-bold text-sm min-[400px]:text-base sm:text-xl text-[#111C3A] tracking-tight font-sans">
            {pageTitle}
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/mcp"
            aria-label={isSyncing ? "ChatGPT MCP Hub, syncing clinic data" : "ChatGPT MCP Hub"}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#D4EDF3] bg-[#EDF7FA] transition-colors hover:bg-[#BEE3E9]/30 xl:flex"
          >
            <span className="flex h-2 w-2 relative" aria-hidden="true">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-[#0089A8] ${isSyncing ? "animate-ping opacity-100" : "animate-pulse opacity-75"}`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0089A8]"></span>
            </span>
          </Link>

          {/* Superadmin Console Shortcut */}
          {isSuperAdmin && (
            <Link
              href="/admin"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111C3A] hover:bg-slate-800 text-teal-400 border border-slate-700 text-xs font-mono font-bold transition-all shadow-2xs"
              title="Open Platform Multi-Clinic Operations Center"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Admin Console</span>
            </Link>
          )}

          {/* Quick Schedule Button (hidden on appointments page to avoid duplicate CTAs) */}
          {pathname !== "/dashboard/appointments" && (
            onBookAppointment ? (
              <button type="button" onClick={onBookAppointment} disabled={loading} aria-haspopup="dialog" aria-label="Book Appointment" className={`${bookingButtonClass} disabled:opacity-50`}>
                {bookingButtonLabel}
              </button>
            ) : (
              <Link href="/dashboard/appointments" className={bookingButtonClass}>{bookingButtonLabel}</Link>
            )
          )}

          {/* User Profile Avatar with Google Badge & Sign Out Dropdown */}
          <div className="relative pl-2 border-l border-[#E4E9F0]">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-full focus:outline-none"
              title={`${userName} (${userEmail})`}
              aria-label="Account menu" aria-expanded={showProfileMenu}
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName}
                  className="w-8 h-8 rounded-full border-2 border-[#BEE3E9] object-cover shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#111C3A] text-white font-bold text-xs flex items-center justify-center border-2 border-[#BEE3E9] shadow-2xs">
                  {initials}
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E4E9F0] shadow-xl p-3 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="pb-2.5 mb-2 border-b border-[#E4E9F0]">
                  <div className="font-bold text-[#111C3A] truncate">{userName}</div>
                  <div className="text-[11px] text-[#52627A] font-mono truncate">{userEmail}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Google Authenticated</span>
                  </div>
                </div>

                {isSuperAdmin && (
                  <Link
                    href="/admin"
                    className="w-full text-left px-3 py-2 rounded-xl text-teal-700 hover:bg-teal-50 flex items-center gap-2 font-medium transition-colors mb-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Platform Admin Console</span>
                  </Link>
                )}

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

