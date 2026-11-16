"use client";

import React from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { clinicProfile } from "@/lib/mockData";
import { useClinic } from "@/context/ClinicContext";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, title = "Clinical Dashboard" }) => {
  const { isSyncing } = useClinic();

  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F1]/95 backdrop-blur-md border-b border-[#E7E9E3] px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-[#586B67] hover:bg-[#E8F0F1]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg sm:text-xl text-[#1E2D2B] tracking-tight font-sans">
              {title}
            </h1>
            <p className="text-[11px] text-[#586B67] font-medium hidden sm:block">
              {clinicProfile.name} • Dr. Ananya&apos;s Solo Chair Operatory
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

          {/* User Profile Avatar with Google Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E7E9E3]">
            <div className="w-8 h-8 rounded-full bg-[#1E2D2B] text-white font-bold text-xs flex items-center justify-center border-2 border-[#BDDBD1] shadow-xs" title="Dr. Ananya Ray">
              AR
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

