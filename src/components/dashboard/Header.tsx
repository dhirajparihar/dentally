"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, Plus, LogOut, ShieldCheck } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { clinicProfile } from "@/lib/mockData";
import { useClinic } from "@/context/ClinicContext";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, title = "Clinical Dashboard" }) => {
  const { isSyncing } = useClinic();
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const userName = session?.user?.name || clinicProfile.dentistName;
  const userEmail = session?.user?.email || clinicProfile.email;
  const userImage = session?.user?.image;
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F1]/95 backdrop-blur-md border-b border-[#DCE2DE] px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-[#3D5450] hover:bg-[#E8F0F1]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg sm:text-xl text-[#1E2D2B] tracking-tight font-sans">
              {title}
            </h1>
            <p className="text-[11px] text-[#3D5450] font-medium hidden sm:block">
              {clinicProfile.name} • {userName}&apos;s Operatory
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live MCP Connection Indicator Pill */}
          <Link
            href="/dashboard/mcp"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8F0F1] border border-[#C7E7EC] text-[#1E2D2B] text-xs font-mono font-medium hover:bg-[#BDDBD1]/30 transition-colors"
            title="MCP Server active & two-way synced with ChatGPT"
          >
            <span className="flex h-2 w-2 relative">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-[#2F8EAC] ${isSyncing ? "animate-ping opacity-100" : "animate-pulse opacity-75"}`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2F8EAC]"></span>
            </span>
            <span>ChatGPT MCP: {isSyncing ? "Syncing..." : "Synced & Active"}</span>
          </Link>

          {/* Quick Schedule Button */}
          <Link
            href="/dashboard/appointments"
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#2F8EAC] text-white text-xs sm:text-sm font-semibold hover:bg-[#24728A] transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Book Appointment</span>
            <span className="sm:hidden">Book</span>
          </Link>

          {/* User Profile Avatar with Google Badge & Sign Out Dropdown */}
          <div className="relative pl-2 border-l border-[#DCE2DE]">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-full focus:outline-none"
              title={`${userName} (${userEmail})`}
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName}
                  className="w-8 h-8 rounded-full border-2 border-[#BDDBD1] object-cover shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1E2D2B] text-white font-bold text-xs flex items-center justify-center border-2 border-[#BDDBD1] shadow-2xs">
                  {initials}
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#DCE2DE] shadow-xl p-3 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="pb-2.5 mb-2 border-b border-[#DCE2DE]">
                  <div className="font-bold text-[#1E2D2B] truncate">{userName}</div>
                  <div className="text-[11px] text-[#3D5450] font-mono truncate">{userEmail}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Google Authenticated</span>
                  </div>
                </div>

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

